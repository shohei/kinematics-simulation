/*----------------------------------------
   conical1.js
   円錐振り子
   解法1(等速円運動で解く)
   オイラー法とかえる跳び法
-----------------------------------------*/
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

var dt;//数値計算時のタイムステップ
var heightFix = 2;//固定点の高さ
var height0;//おもりの高さ
var length0;//振り子の長さ
var mass0;  //おもりの質量
var theta;  //振れ角(rad)
var omega;  //振り子の角速度
var vx, vy, x, y, speed;
var count;  //かえる跳び法で必要な演算回数
var n_method = 0;//数値解法の種類
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
  
  var period = 0, t1 = 0, t2 = 0;
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
      //オイラー法とかえる跳び法
      var r2 = x * x + y * y;
      var v2 = vx * vx + vy * vy;
      //加速度
      var ax = -v2 * x / r2;
      var ay = -v2 * y / r2;
      
	  if(n_method == 1 && count == 0) {//最初のかえる跳び
        vx += ax * dt/2; vy += ay * dt/2; 
      }
      else {                           
        vx += ax * dt; vy += ay * dt; 
      }
      x += vx * dt; y += vy * dt;
	  
      //おもり(xy平面で運動）
      rigid[0].vPos.x = x; 
      rigid[0].vPos.y = y;
	  rigid[0].vEuler = getEulerZ(rigid[0].vPos, new Vector3(0, 0, heightFix));//おもり自身の回転角
	  //振り子の棒
	  rigid[1].vPos.x = rigid[0].vPos.x / 2.0;
	  rigid[1].vPos.y = rigid[0].vPos.y / 2.0;
	  rigid[1].vEuler = rigid[0].vEuler;
	  //周期の計測
	  var rr = Math.sqrt(r2)
	  var e = 0.05;
	  if(x < e && x > -e && y < rr + e && y > rr - e)
	  {
	    t2 = elapseTime;
		period = t2 - t1;
	  }
      else{ t1 = t2; }
	  //周期の表示
　　　form2.period.value = period.toString();

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
      count = 1;
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
  periodTrace = parseFloat(form2.periodTrace.value);

  dt = parseFloat(form1.dt.value);//計算時のタイムステップ[s]

  length0 = parseFloat(form2.length0.value);
  mass0 = parseFloat(form2.mass0.value);
  var dia0 = parseFloat(form2.dia0.value);
  var thetaDeg = parseFloat(form2.angle0.value);
  theta = thetaDeg * DEG_TO_RAD;
  
  //円運動の角速度とその2乗
  var omega2 = gravity / (length0 * Math.cos(theta));
  //円運動の半径
  var radius0 = length0 * Math.sin(theta);
  //おもりの高さ
  height0 = heightFix - length0 * Math.cos(theta);
  //omega = Math.sqrt(omega2);
  //偏角phiの初期値
  var phi = Math.PI / 2.0;
  //位置の初期値
  x = radius0 * Math.cos(phi);
  y = radius0 * Math.sin(phi);
  //速度の初期値
  speed = radius0 * Math.sqrt(omega2);;
  vx = -speed * Math.sin(phi);
  vy =  speed * Math.cos(phi);

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
  //オブジェクト2(固定台)
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

  var n = dummy.initVertexBuffers(gl);
  //軌跡用オブジェクト
  gl.uniform1i(flagPointLoc, true);
  n = initVertexPoints();
  gl.drawArrays(gl.POINTS, 0, n);
  gl.uniform1i(flagPointLoc, false);
  //フロア
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

function onClick_method()
{
  var radio1 =  document.getElementsByName("radio1");
  for(var i = 0; i < radio1.length; i++)
  {
     if(radio1[i].checked) n_method = i;
  }
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
  count = 0;
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
  
  //軌跡用オブジェクトが1組
  return len;
}

