/*------------------------------------------------------
    double3.js
    2重振り子
    ルンゲ・クッタ・ギル法
--------------------------------------------------------*/
var canvas; //canvas要素
var gl;     //WebGL描画用コンテキスト
var camera; //カメラ
var light;  //光源
var numRigid = 5;
var rigid = []; 
var dummy;
var floor0;
var coord = [];//座標軸表示用
var plane = [0.0, 0.0, 1.0, 0.0];//床平面(z = 0)
var shadow_value = 0.2;

var dt;
var viscous;//粘性抵抗係数
var heightFix = 2;//固定点の高さ
var length1, length2;//振り子の長さ
var mass1, mass2;  //おもりの質量
var mu, len12, len21, gl1, gl2;
var theta1, theya2;  //振れ角(rad)
var omega1, omega2;  //振り子の角速度
//Runge-Kutta-Gillで使用する配列
var kk1=[], kk2=[], rr1=[], qq1=[], uu=[], rr2=[], qq2=[], vv=[];

//animation
var fps = 0;
var lastTime = new Date().getTime();
var elapseTime = 0.0;//全経過時間
var elapseTime0 = 0.0;
var elapseTime1 = 0.0;
var flagStart = false;
var flagStep = false;
var flagReset = false;
var flagDebug = false;
//軌跡データ用
var tracePos0 = []; //軌跡配列
var tracePos1 = []; //軌跡配列
var maxTrace = 100; //軌跡点個数の最大値
var numTrace = 20;  //軌跡点の表示個数
var countTrace = 0; //軌跡点個数のカウン ト
var periodTrace = 0.1;//軌跡点を表示する時間間隔
var timeTrace = 0;  //その経過時間

function webMain() 
{
  // Canvas要素を取得する
  canvas = document.getElementById('WebGL');
  // WebGL描画用のコンテキストを取得する
  gl = WebGLUtils.setupWebGL(canvas);
  if (!gl) {
    alert('WebGLコンテキストの取得に失敗');
    return;
  }
  var VS_SOURCE = document.getElementById("vs").textContent;
  var FS_SOURCE = document.getElementById("fs").textContent;

  if(!initGlsl(gl, VS_SOURCE, FS_SOURCE)){
    alert("GLSL初期化に失敗");
    return;
  }
  flagQuaternion = false;
  //Canvasをクリアする色を設定し、隠面消去機能を有効にする
  gl.clearColor(0.1, 0.1, 0.2, 1.0);
  gl.enable(gl.DEPTH_TEST);
  initCamera();
  initObject();
  readyTexture();
  
  var alpha1, alpha2; 
  var ss, cc, s1, s2, r1, r2, h1, h2, aa, pa, qa;
  //係数配列
  var sq2 = Math.SQRT2; 
  var a = [ 0.0, 0.5, 0.5 * (2.0 - sq2), 0.5 * (2.0 + sq2), 1.0 / 6.0 ];
  var b = [ 0.0, 2.0, 1.0, 1.0, 2.0 ];
  var c = [ 0.0, 0.5, 0.5 * (2.0 - sq2), 0.5 * (2.0 + sq2), 0.5 ];

  var animate = function()
  {
    //繰り返し呼び出す関数を登録
    requestAnimationFrame(animate, canvas); //webgl-utilsで定義
    //時間計測
    var currentTime = new Date().getTime();
    var frameTime = (currentTime - lastTime) / 1000.0;//時間刻み[sec]
    elapseTime += frameTime;
    elapseTime1 += frameTime;
    fps ++;
    if(elapseTime1 >= 0.5)
    {
      form1.fps.value = 2*fps.toString(); //1秒間隔で表示
      var timestep = 0.5 / fps;
      form1.step.value = timestep.toString();
      fps = 0;
      elapseTime1 = 0.0;
    }
    lastTime = currentTime;

    if(flagStart)
    {
      //Runge-Kutta-Gill
	  ss = Math.sin(theta1 - theta2);
	  cc = Math.cos(theta1 - theta2);
	  s1 = Math.sin(theta1);
	  s2 = Math.sin(theta2);
	  aa = mu * cc * cc -1.0;
	  pa = mu * ss / aa;
	  qa= gl1 / aa;

	  alpha1 = pa * (omega1 * omega1 * cc + len21 * omega2 * omega2) + qa * (s1 - mu * cc * s2)
					   - (viscous / mass1) * omega1;
	  alpha2 = len12 * (ss * omega1 * omega1 - cc * alpha1) - gl2 * s2
             - (viscous / mass2) * omega2;

      for (var i = 1; i <= 4; i++)
	  {
		kk1[i] = (pa * (uu[i-1] * uu[i-1] * cc + len21 * vv[i-1] * vv[i-1]) + qa * (s1 - mu * cc * s2) - (viscous / mass1) * uu[i-1]) * dt;
		rr1[i] = a[i] * (kk1[i] - b[i] * qq1[i - 1]);
		uu[i] = uu[i-1] + rr1[i];
		qq1[i] = qq1[i-1] + 3.0 * rr1[i] - c[i] * kk1[i];
		kk2[i] = (len12 * (ss * uu[i-1] * uu[i-1]  - cc * alpha1) - gl2 * s2 - (viscous / mass2) * vv[i-1]) * dt;
		rr2[i] = a[i] * (kk2[i] - b[i] * qq2[i-1]);
		vv[i] = vv[i-1] + rr2[i];
		qq2[i] = qq2[i-1] + 3.0 * rr2[i] - c[i] * kk2[i];
	  }
	  qq1[0] = qq1[4]; qq2[0] = qq2[4];
	  uu[0] = uu[4]; vv[0] = vv[4];
	  omega1 = uu[4];
	  omega2 = vv[4];

	  theta1 += omega1 * dt;
	  theta2 += omega2 * dt;


	  r1 = length1 * s1;
	  r2 = r1 + length2 * s2;
	  h1 = heightFix - length1 * Math.cos(theta1);
	  h2 = h1 - length2 * Math.cos(theta2);

      //おもり(yz平面で運動）
      rigid[0].vPos = new Vector3(0, r1, h1);
	  rigid[0].vEuler.x = theta1 * RAD_TO_DEG;//おもり自身の回転角
	  //振り1子の棒
	  rigid[1].vPos = new Vector3(0, r1/2, (heightFix + h1)/2);
	  rigid[1].vEuler = rigid[0].vEuler;
	  //おもり2
      rigid[2].vPos = new Vector3(0.0, r2, h2);
	  rigid[2].vEuler.x = theta2 * RAD_TO_DEG;
	  //棒2
	  rigid[3].vPos = new Vector3(0.0, (r1 + r2) / 2.0, (h1 + h2) / 2.0);
	  rigid[3].vEuler = rigid[2].vEuler;
	  
      elapseTime0 = elapseTime;//現在の経過時間を保存
      form1.time.value = elapseTime.toString();//経過時間を表示
      if(flagStep) { flagStart = false; } 
      //軌跡位置データ作成
      if(timeTrace == 0) {
        tracePos0[countTrace].copy(rigid[0].vPos);        
        tracePos1[countTrace].copy(rigid[2].vPos);
        countTrace ++;
        if(countTrace >= numTrace) countTrace = 0;
      }
      timeTrace += dt;
      if(timeTrace >= periodTrace) timeTrace = 0;
      
      display();
    }
  }
  animate();
}
//------------------------------------------------------------------------
function readyTexture() 
{
  //テクスチャオブジェクトを作成する
  var tex = [];
  tex[0] = gl.createTexture();   
  tex[1] = gl.createTexture(); 
  
  //Imageオブジェクトを作成する
  var image = [];
  for(var i = 0; i < numRigid; i++) image[i] = new Image();
  image[0].src = '../imageJPEG/check3.jpg';
  image[1].src = '../imageJPEG/check4.jpg';
  var flagLoaded = [];//画像読み込み終了フラグ
  flagLoaded[0] = false;
  flagLoaded[1] = false;
  
  // 画像の読み込み完了時のイベントハンドラを設定する
  image[0].onload = function(){ setTexture(0); }
  image[1].onload = function(){ setTexture(1); }

  function setTexture(no) 
  {
    // テクスチャユニット0を有効にする
    if(no == 0) gl.activeTexture(gl.TEXTURE0);
    else gl.activeTexture(gl.TEXTURE1);
    // テクスチャオブジェクトをターゲットにバインドする
    gl.bindTexture(gl.TEXTURE_2D, tex[no]);
    // テクスチャ画像を設定する
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image[no]);
    //ミップマップ自動生成
    gl.generateMipmap(gl.TEXTURE_2D);
    // テクスチャパラメータを設定する
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    flagLoaded[no] = true;
    //2つの画像の読み込み終了後描画
    if(flagLoaded[0] && flagLoaded[1]) display();
  }
}

//--------------------------------------------
function initCamera()
{
  //カメラと光源の初期設定
　//光源インスタンスを作成
  light = new Light();
  light.pos = [5, 5, 20, 1];
  //初期設定値をHTMLのフォームに表示
  form2.lightX.value = light.pos[0];
  form2.lightY.value = light.pos[1];
  form2.lightZ.value = light.pos[2];
　//カメラ・インスタンスを作成
  camera = new Camera();
  camera.dist = 5; 
  camera.theta = -10;
  camera.cnt[2] = 1.5;
  camera.getPos();//カメラ位置を計算
  
  mouseOperation(canvas, camera);//swgSupport.js
}  
  
function initObject()
{
  flagStart = false;
  periodTrace = parseFloat(form2.periodTrace.value);

  dt = parseFloat(form1.dt.value);//計算時のタイムステップ[s]
  //初期設定
  viscous = parseFloat(form2.viscous.value);
  length1 = parseFloat(form2.length1.value);
  mass1 = parseFloat(form2.mass1.value);
  var thetaDeg1 = parseFloat(form2.theta1.value);
  length2 = parseFloat(form2.length2.value);
  mass2 = parseFloat(form2.mass2.value);
  var thetaDeg2 = parseFloat(form2.theta2.value);
  //定数
  len12 = length1 / length2;
  len21 = length2 / length1;
  gl1 = gravity / length1;
  gl2 = gravity / length2;
  mu = mass2 / (mass1 + mass2);
  //数値計算の初期値
  theta1 = thetaDeg1 * DEG_TO_RAD;//支持棒の振れ角
  omega1 = parseFloat(form2.omega1.value);//角速度
  theta2 = thetaDeg2 * DEG_TO_RAD;//支持棒の振れ角
  omega2 = parseFloat(form2.omega2.value);;//角速度
  //配列の初期値
  qq1[0] = 0.0; qq2[0] = 0.0; uu[0] = omega1; vv[0] = omega2;

  //オブジェクトの位置，マテリアルを決定する
  for(var i = 0; i < numRigid; i++) rigid[i] = new Rigid();
  //おもりの初期の半径
  var radius1 = length1 * Math.sin(theta1);
  var radius2 = radius1 + length2 * Math.sin(theta2);
  //高さ
  var height1 = heightFix - length1 * Math.cos(theta1);
  var height2 = height1 - length2 * Math.cos(theta2);
 
  //オブジェクト0(おもり1）
  var dia0 = 0.15;
  rigid[0].kind = "SPHERE";
  rigid[0].vSize = new Vector3(dia0, dia0, dia0);
  rigid[0].vPos = new Vector3(0.0, radius1, height1);
  rigid[0].vEuler = new Vector3(thetaDeg1, 0, 0);//おもり自身の傾斜角
  rigid[0].nSlice = 12;
  rigid[0].nStack = 12;
  rigid[0].flagTexture = true;
  rigid[0].flagDebug = flagDebug;
  //オブジェクト1(支持棒1）
  rigid[1].kind = "CYLINDER";
  rigid[1].vSize = new  Vector3(0.04, 0.04, length1) ;
  //rigid[1].vPos = new Vector3(0, radius1/2.0, (heightFix - length1*Math.cos(theta1) / 2.0);
  rigid[1].vPos = new Vector3(0, radius1/2.0, (heightFix + height1) / 2.0);
  rigid[1].vEuler = new Vector3(thetaDeg1, 0, 0);
  rigid[1].nSlice = 12;
  rigid[1].radiusRatio = 1.0;
  rigid[1].flagTexture = false;
  rigid[1].flagDebug = flagDebug;
  rigid[1].diffuse = [0.8, 0.8, 0.4, 1.0];
  rigid[1].ambient = [0.4, 0.4, 0.2, 1.0];
  //オブジェクト2(おもり2）
  dia0 = 0.13;
  rigid[2].kind = "SPHERE";
  rigid[2].vSize = new Vector3(dia0, dia0, dia0);
  //rigid[2].vPos = new Vector3(0.0, rigid[0].vPos.y + length2 * Math.sin(theta2), rigid[0].vPos.z - length2 * Math.cos(theta2));
  rigid[2].vPos = new Vector3(0.0, radius2, height2);
  rigid[2].vEuler = new Vector3(thetaDeg1, 0, 0);//おもり自身の傾斜角
  rigid[2].nSlice = 12;
  rigid[2].nStack = 12;
  rigid[2].flagTexture = true;
  rigid[2].flagDebug = flagDebug;
  //オブジェクト3(支持棒2）
  rigid[3].kind = "CYLINDER";
  rigid[3].vSize = new  Vector3(0.03, 0.03, length2) ;
//  rigid[3].vPos = new Vector3(0, rigid[0].vPos.y + length2 * Math.sin(theta2)/2.0, rigid[0].vPos.z - length2*Math.cos(theta2) / 2.0);
  rigid[3].vPos = new Vector3(0, (radius1+radius2)/2.0, (height1 + height2) / 2.0);
  rigid[3].vEuler = new Vector3(thetaDeg2, 0, 0);
  rigid[3].nSlice = 12;
  rigid[3].radiusRatio = 1.0;
  rigid[3].flagTexture = false;
  rigid[3].flagDebug = flagDebug;
  rigid[3].diffuse = [0.8, 0.8, 0.4, 1.0];
  rigid[3].ambient = [0.4, 0.4, 0.2, 1.0];
  
  //オブジェクト2(固定台)
  rigid[4].kind = "CUBE";
  rigid[4].vSize = new Vector3(0.2, 0.2, 0.1);
  rigid[4].vPos = new Vector3(0.0, 0.0, heightFix+rigid[4].vSize.z/2.0);
  rigid[4].diffuse = [0.8, 0.4, 0.4, 1.0];
  rigid[4].ambient = [0.4, 0.2, 0.2, 1.0];

  //軌跡用点表示のためのダミー
  dummy = new Rigid();
  dummy.nSlice = 30;//非表示
  dummy.nStack = 30;
  //軌跡用オブジェクトの位置座標配列
　for(var i = 0; i < maxTrace; i++) {
    tracePos0[i] = new Vector3(1000,0,0);//初期値は遠方
    tracePos1[i] = new Vector3(1000,0,0);//初期値は遠方
  }

  //フロア
  floor0 = new Rigid();
  floor0.kind = "CHECK_PLATE";
  floor0.vPos = new Vector3(0.0, 0.0, -plane[3]-0.01);
  floor0.vSize = new Vector3(40, 40, 1);
  floor0.nSlice = 20;//x方向分割数
  floor0.nStack = 20;//y方向分割数
  floor0.specular = [0.5, 0.5, 0.5, 1.0];
  floor0.shininess = 50;
  floor0.flagCheck = true;

  display();
}

//---------------------------------------------
function display()
{ 
  //光源
  var lightPosLoc = gl.getUniformLocation(gl.program, 'u_lightPos');
  gl.uniform4fv(lightPosLoc, light.pos);
  var lightColLoc = gl.getUniformLocation(gl.program, 'u_lightColor');
  gl.uniform4fv(lightColLoc, light.color);
  
  var cameraLoc = gl.getUniformLocation(gl.program, 'u_cameraPos');
  gl.uniform3fv(cameraLoc, camera.pos);
  
  //ビュー投影行列を計算する
  var vpMatrix = new Matrix4();// 初期化
  vpMatrix.perspective(camera.fovy, canvas.width/canvas.height, camera.near, camera.far);
  //vpMatrix.lookAt(camera.pos[0], camera.pos[1], v, 0, 0, 0, 0, 0, 1);
  if(Math.cos(Math.PI * camera.theta /180.0) >= 0.0)//カメラ仰角90度でﾋﾞｭｰｱｯﾌﾟﾍﾞｸﾄﾙ切替
	  vpMatrix.lookAt(camera.pos[0], camera.pos[1], camera.pos[2], camera.cnt[0], camera.cnt[1], camera.cnt[2], 0.0, 0.0, 1.0);
  else
	  vpMatrix.lookAt(camera.pos[0], camera.pos[1], camera.pos[2], camera.cnt[0], camera.cnt[1], camera.cnt[2], 0.0, 0.0, -1.0);

  var vpMatrixLoc = gl.getUniformLocation(gl.program, 'u_vpMatrix');
  gl.uniformMatrix4fv(vpMatrixLoc, false, vpMatrix.elements);

  // カラーバッファとデプスバッファをクリアする
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.viewport(0, 0, canvas.width, canvas.height);

  var flagPointLoc = gl.getUniformLocation(gl.program, 'u_flagPoint');

  gl.uniform1i(flagPointLoc, false);
  var samplerLoc = gl.getUniformLocation(gl.program, 'u_sampler');
  var n;
  for(var k = 0; k < numRigid; k++)
  {
    if(k == 0) gl.activeTexture(gl.TEXTURE0);
    else gl.activeTexture(gl.TEXTURE1);
    if(k == 0) gl.uniform1i(samplerLoc, 0);
    else if(k == 2) gl.uniform1i(samplerLoc, 1);      
    //オブジェクトの描画
    n = rigid[k].initVertexBuffers(gl);
    rigid[k].draw(gl, n);
  }

  var n = dummy.initVertexBuffers(gl);
  //軌跡用オブジェクト
  gl.uniform1i(flagPointLoc, true);
  n = initVertexPoints();
  gl.drawArrays(gl.POINTS, 0, n);
  gl.uniform1i(flagPointLoc, false);
  //フロアの表示
  n = floor0.initVertexBuffers(gl);
  floor0.draw(gl, n);

  //影 
  drawShadow();    

  function drawShadow()
  {
    gl.depthMask(false);
    gl.blendFunc(gl.SRC_ALPHA_SATURATE,gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.BLEND);
    for(var k = 0; k < numRigid; k++)
    {
      rigid[k].shadow = shadow_value;
      n = rigid[k].initVertexBuffers(gl);
      rigid[k].draw(gl, n);
      rigid[k].shadow = 0;//影描画後は元に戻す
    }
    gl.disable(gl.BLEND);
    gl.depthMask(true);
  }
}

//---------------------------------------------------
//イベント処理
function onClickC_Size()
{
  canvas.width = form1.c_sizeX.value;
  canvas.height = form1.c_sizeY.value;
  display();
}

function onChangeData()
{
  initObject();
}

function onClickLight()
{
  light.pos[0] = parseFloat(form2.lightX.value);
  light.pos[1] = parseFloat(form2.lightY.value);
  light.pos[2] = parseFloat(form2.lightZ.value);
  display();
}

function onClickDebug()
{
  if(form2.debug.checked) flagDebug = true;
  else                    flagDebug = false;
  
  rigid[0].flagDebug = flagDebug;
  rigid[1].flagDebug = flagDebug;
  rigid[2].flagDebug = flagDebug;
  display();
}

function onClickStart()
{
  fps = 0;
  elapseTime = elapseTime0;
  elapseTime = 0.0;
  elapseTime1 = 0.0;
  countTrace = 0;
  timeTrace = 0;

  flagStart = true;
  flagStep = false;
  lastTime = new Date().getTime();
  
  if(rigid[0].kind == "SPHERE")
  { if(rigid[0].vSize.x != rigid[0].vSize.y || rigid[0].vSize.y != rigid[0].vSize.z || rigid[0].vSize.x != rigid[0].vSize.z)
    alert("球のサイズはすべて同じ値にすること!");
  }
  else if(rigid[0].kind == "CYLINDER")
  { if(rigid[0].vSize.x != rigid[0].vSize.y)
    alert("円柱のサイズx,yは同じ値にすること!");
  } 
}
function onClickFreeze()
{
  if(flagStart) { flagStart = false; }
  else { flagStart = true; elapseTime = elapseTime0; }
  flagStep = false;
}
function onClickStep()
{
  flagStep = true;
  flagStart = true;
  elapseTime = elapseTime0;
}
function onClickReset()
{
  elapseTime0 = 0;
  flagStart = false;
  flagStep = false;
  initObject();
  form1.time.value = "0";
  for(var i = 0; i < maxTrace; i++) tracePos0[i].x = 1000;
  display();
}
function onClickCameraReset()
{
  initCamera();
  display();
}

function onClickShadow()
{
  shadow_value = parseFloat(form2.shadow.value);
  display();
}

function onClickPeriodTrace()
{
  periodTrace = parseFloat(form2.periodTrace.value);
}
function onClickNumTrace()
{
  numTrace = parseFloat(form2.numTrace.value);
}

function initVertexPoints() 
{
  //軌跡用オブジェクトを点で描画するときの点座標を作成
  var vertices = [];
  var len = tracePos0.length;
  for(var i = 0; i < len; i++) 
  {
    vertices.push(tracePos0[i].x);
    vertices.push(tracePos0[i].y);
    vertices.push(tracePos0[i].z);
    vertices.push(0);//オブジェクト番号
    vertices.push(tracePos1[i].x);
    vertices.push(tracePos1[i].y);
    vertices.push(tracePos1[i].z);
    vertices.push(1);
  }

  // バッファオブジェクトを作成する
  var vertexBuffer = gl.createBuffer();
  // バッファオブジェクトをバインドにする
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  // バッファオブジェクトにデータを書き込む
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

  vertexLoc = gl.getAttribLocation(gl.program, 'a_vertex');
  // a_Position変数にバッファオブジェクトを割り当てる
  gl.vertexAttribPointer(vertexLoc, 4, gl.FLOAT, false, 0, 0);

  // a_verte変数でのバッファオブジェクトの割り当てを有効化する
  gl.enableVertexAttribArray(vertexLoc);
  // バッファオブジェクトのバインドを解除する
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  
  //軌跡用オブジェクトが2個
  return 2*len;
}

