/*-----------------------------------
     spherical.js
     球面振り子
     ルンゲ・クッタ・ギル法
-------------------------------------*/
var canvas; //canvas要素
var gl;     //WebGL描画用コンテキスト
var camera; //カメラ
var light;  //光源
var numRigid = 3;
var rigid = []; 
var dummy;
var floor0;
var coord = [];//座標軸表示用
var plane = [0.0, 0.0, 1.0, 0.0];//床平面(z = 0)
var shadow_value = 0.2;

var dt;
var viscous;//粘性抵抗係数
var heightFix = 2;//固定点の高さ
var length0;//振り子の長さ
var mass0;  //おもりの質量
var theta, phi;  //振れ角,偏角(rad)
var thetaDeg;//振れ角(deg)
var omegaT, omegaP;  //振り子の角速度
var omegaP0; //振り子の振動周期
var kt = [], kp = [], rt = [], qt = [];
var uu = [], rp = [], qp = [], vv = [];
//animation
var fps = 0;
var lastTime = new Date().getTime();
var elapseTime = 0.0;//全経過時間
var elapseTime0 = 0.0;
var elapseTime1 = 0.0;
var flagStart = false;
//var flagFreeze = false;
var flagStep = false;
var flagReset = false;
var flagDebug = false;
//軌跡データ用
var flagTrace = false;
var tracePos0 = []; //軌跡配列
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
  if (!gl) 
  {
    alert('WebGLコンテキストの取得に失敗');
    return;
  }

  var VS_SOURCE = document.getElementById("vs").textContent;
  var FS_SOURCE = document.getElementById("fs").textContent;

  if(!initGlsl(gl, VS_SOURCE, FS_SOURCE))
  {
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
      var ss = Math.sin(theta);
      var cc = Math.cos(theta);
	  if(Math.abs(omegaP0) <= 0.0001)
	  {//単振り子としてオイラー法で解く
	    var alphaT = - (gravity/length0) * ss - (viscous/mass0) * omegaT;
	    omegaT += alphaT * dt;
	    omegaP = 0.0;
      }
	  else
	  {//ルンゲ・クッタ・ギル法
	    if(Math.abs(ss) < 0.001) flagStart = false; 

        for (var i = 1; i <= 4; i++)
        {
			kt[i] = (ss * cc * vv[i - 1] * vv[i - 1] - (gravity / length0) * ss - (viscous / mass0) * uu[i - 1]) * dt;
			rt[i] = a[i] * (kt[i] - b[i] * qt[i - 1]);
			uu[i] = uu[i - 1] + rt[i];
			qt[i] = qt[i - 1] + 3.0 * rt[i] - c[i] * kt[i];
			kp[i] = (-2.0 * (cc / ss) * uu[i-1] * vv[i-1] - (viscous / mass0) * vv[i-1]) * dt;
			rp[i] = a[i] * (kp[i] - b[i] * qp[i-1]);
			vv[i] = vv[i-1] + rp[i];
			qp[i] = qp[i-1] + 3.0 * rp[i] - c[i] * kp[i];
        }
		qt[0] = qt[4]; qp[0] = qp[4];
		uu[0] = uu[4]; vv[0] = vv[4];
		omegaT = uu[4];
		omegaP = vv[4];
      }	  
	  theta += omegaT * dt;
	  phi += omegaP * dt;

	  rr = length0 * ss;
	  hh = heightFix - length0 * cc;

      //おもり(xy平面で運動）
      rigid[0].vPos.x = rr * Math.cos(phi); 
      rigid[0].vPos.y = rr * Math.sin(phi);
	  rigid[0].vPos.z = hh;
	  rigid[0].vEuler = getEulerZ(rigid[0].vPos, new Vector3(0, 0, heightFix));//おもり自身の回転角
	  //振り子の棒
	  rigid[1].vPos.x = rigid[0].vPos.x / 2.0;
	  rigid[1].vPos.y = rigid[0].vPos.y / 2.0;
	  rigid[1].vPos.z = (heightFix + hh) / 2.0;
	  rigid[1].vEuler = rigid[0].vEuler;

      elapseTime0 = elapseTime;//現在の経過時間を保存
      form1.time.value = elapseTime.toString();//経過時間を表示
      
      if(flagStep) { flagStart = false; } 
      
      //軌跡位置データ作成
      if(timeTrace == 0) 
      {
        tracePos0[countTrace].copy(rigid[0].vPos);        
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
  var tex = gl.createTexture();   
  
  //Imageオブジェクトを作成する
  var image = new Image();
  image.src = '../imageJPEG/check3.jpg';
  var flagLoaded = false;//画像読み込み終了フラグ
  
  // 画像の読み込み完了時のイベントハンドラを設定する
  image.onload = function(){ setTexture(); }

  function setTexture()
  {
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);// 画像のY軸を反転する
    // テクスチャユニット0を有効にする
    gl.activeTexture(gl.TEXTURE0);
    // テクスチャオブジェクトをターゲットにバインドする
    gl.bindTexture(gl.TEXTURE_2D, tex);
    // テクスチャ画像を設定する
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
    //ミップマップ自動生成
    gl.generateMipmap(gl.TEXTURE_2D);
    // テクスチャパラメータを設定する
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    flagLoaded = true;
    //画像の読み込み終了後描画
    if(flagLoaded) display();
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

  dt = parseFloat(form1.dt.value);//計算時のタイムステップ[s]

  viscous = parseFloat(form2.viscous.value);
  length0 = parseFloat(form2.length0.value);
  mass0 = parseFloat(form2.mass0.value);
  var dia0 = parseFloat(form2.dia0.value);
  var thetaDeg = parseFloat(form2.angle0.value);
  theta = thetaDeg * DEG_TO_RAD; 
  
  //振り子運動パラメータの初期値
  omegaT = parseFloat(form2.omegaT0.value);//xz面内角速度
  omegaP = parseFloat(form2.omegaP0.value);//水平面内円運動の角速度
  omegaP0 = omegaP;//この初期値はanimate()ルーチンで使用される
  //円運動の半径
  var radius0 = length0 * Math.sin(theta);
  //高さ
  var height0 = heightFix - length0 * Math.cos(theta);
  //偏角phiの初期値
  phi = Math.PI / 2.0;
	
  //Runge-Kutta-Gill法で使われる配列の初期値
  for(var i = 0; i < 5; i++) {kt[i] = 0; kp[i] = 0; rt[i] = 0; qt[i] = 0; uu[i] = 0; rp[i] = 0; qp[i] = 0; vv[i] = 0; }
  qt[0] = 0.0; qp[0] = 0.0; uu[0] = omegaT; vv[0] = omegaP0;

  //オブジェクトの位置，マテリアルを決定する
  for(var i = 0; i < numRigid; i++) rigid[i] = new Rigid();
 
  //オブジェクト0(おもり）
  rigid[0].kind = "SPHERE";
  rigid[0].vSize = new Vector3(dia0, dia0, dia0);
  rigid[0].vPos = new Vector3(0.0, radius0, height0);
  rigid[0].vEuler = getEulerZ(rigid[0].vPos, new Vector3(0, 0, heightFix) );//おもり自身の傾斜角
  rigid[0].nSlice = 12;
  rigid[0].nStack = 12;
  rigid[0].flagTexture = true;
  rigid[0].flagDebug = flagDebug;
  //オブジェクト1(支持棒、糸）
  rigid[1].kind = "CYLINDER";
  rigid[1].vSize = new  Vector3(0.05, 0.05, length0) ;
  rigid[1].vPos = new Vector3(rigid[0].vPos.x/2, rigid[0].vPos.y / 2.0, heightFix - (heightFix - height0) / 2.0);
  rigid[1].vEuler = rigid[0].vEuler;
  rigid[1].nSlice = 12;
  rigid[1].radiusRatio = 1.0;
  rigid[1].flagTexture = false;
  rigid[1].flagDebug = flagDebug;
  rigid[1].diffuse = [0.8, 0.8, 0.4, 1.0];
  rigid[1].ambient = [0.4, 0.4, 0.2, 1.0];
  //オブジェクト2(固定点)
  rigid[2].kind = "CUBE";
  rigid[2].vSize = new Vector3(0.2, 0.2, 0.1);
  rigid[2].vPos = new Vector3(0.0, 0.0, heightFix+rigid[2].vSize.z/2.0);
  rigid[2].diffuse = [0.9, 0.4, 0.2, 1.0];
  rigid[2].ambient = [0.4, 0.2, 0.1, 1.0];

  //軌跡用点表示のためのダミー
  dummy = new Rigid();
  dummy.nSlice = 30;//非表示
  dummy.nStack = 30;
  //軌跡用オブジェクトの位置座標配列
　for(var i = 0; i < maxTrace; i++) {
    tracePos0[i] = new Vector3(1000,0,0);//初期値は遠方
  }

  //フロア
  floor0 = new Rigid();
  floor0.kind = "CHECK_PLATE";
  floor0.vPos = new Vector3(0.0, 0.0, -plane[3]-0.01);
  floor0.vSize = new Vector3(40, 40, 1);
  floor0.nSlice = 20;//x方向分割数
  floor0.nStack = 20;//y方向分割数
  floor0.col1 = [0.4, 0.3, 0.3, 1.0];
  floor0.col2 = [0.2, 0.2, 0.4, 1.0];
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
    gl.uniform1i(samplerLoc, k);
    //オブジェクトの描画
    n = rigid[k].initVertexBuffers(gl);
    rigid[k].draw(gl, n);
  }

  //if(flagTrace)
  {
    var n = dummy.initVertexBuffers(gl);
    //軌跡用オブジェクト
    gl.uniform1i(flagPointLoc, true);
    n = initVertexPoints();
    gl.drawArrays(gl.POINTS, 0, n);
    gl.uniform1i(flagPointLoc, false);
  }

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
  }

  // バッファオブジェクトを作成する
  var vertexBuffer = gl.createBuffer();
  // バッファオブジェクトをバインドにする
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  // バッファオブジェクトにデータを書き込む
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

  vertexLoc = gl.getAttribLocation(gl.program, 'a_vertex');
  // a_Position変数にバッファオブジェクトを割り当てる
  gl.vertexAttribPointer(vertexLoc, 3, gl.FLOAT, false, 0, 0);

  // a_verte変数でのバッファオブジェクトの割り当てを有効化する
  gl.enableVertexAttribArray(vertexLoc);
  // バッファオブジェクトのバインドを解除する
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  
  //Rigidオブジェクトが1個
  return len;
}

