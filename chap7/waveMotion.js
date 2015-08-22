/*------------------------------------------------------
    waveMotion.js
    1次元の波
-------------------------------------------------------*/
var canvas; //canvas要素
var gl;     //WebGL描画用コンテキスト
var camera; //カメラ
var light;  //光源
var sm1;//1次元バネ質点モデルのインスタンス
var floor0;
var plane = [0.0, 0.0, 1.0, 0.0];//床平面(z = 0)
var shadow_value = 0.2;

//数値計算のタイムステップ
var dt;
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
  sm1 = new SpringMass1();//1次元バネ質点モデルのオブジェクト

  //Canvasをクリアする色を設定し、隠面消去機能を有効にする
  gl.clearColor(0.1, 0.1, 0.2, 1.0);
  gl.enable(gl.DEPTH_TEST);
  initCamera();
  initObject();
  
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
      form1.fps.value = 2*fps.toString(); //0.5間隔で表示
      var timestep = 0.5 / fps;
      form1.step.value = timestep.toString();
      fps = 0;
      elapseTime1 = 0.0;
    }
    lastTime = currentTime;

    if(flagStart)
    {
	  var omega = 2.0 * Math.PI * sm1.frequency;//強制振動の角振動数
	  var period = 1.0 / sm1.frequency;
	  var t = elapseTime;
	  
      var tt = dt / 10;
      for(var j = 0; j < 10; j++)
      {
        if(sm1.motion == "TRANSVERSE")
        {
		  if(sm1.mode == "SINGLE")
		  {
		    if(t < period / 2.0)
			  sm1.point[0].vPos.z = sm1.height0 + sm1.amp * Math.sin(omega * t);
          }
          else{//連続波
		    sm1.point[0].vPos.z = sm1.height0 + sm1.amp * Math.sin(omega * t);
          }
		  sm1.testTransverseWave(tt);
        }
        else if(sm1.motion == "LONGITUDE")
        {
          if(sm1.mode == "SINGLE")
          {
			if(t < period / 2.0)
			  sm1.point[0].vPos.y = sm1.vPos.y + sm1.amp * Math.sin(omega * t);
          }
          else{//連続波
            sm1.point[0].vPos.y = sm1.vPos.y + sm1.amp * Math.sin(omega * t);
          }
          sm1.testLongitudinalWave(tt);
        }
        else//混成波 
        {
          if(sm1.mode == "SINGLE")
          {
            if(t < period / 2.0){
              sm1.point[0].vPos.z = sm1.height0 + sm1.amp * Math.sin(omega * t);
			}
          }
          else{//連続波
            sm1.point[0].vPos.z = sm1.height0 + sm1.amp * Math.sin(omega * t);
          }
          sm1.testHybridWave(tt);
		}
		t += tt;
      }

      elapseTime0 = elapseTime;//現在の経過時間を保存
      form1.time.value = elapseTime.toString();//経過時間を表示
      
      if(flagStep) { flagStart = false; } 

      display();
    }
  }
  animate();
}
//--------------------------------------------
function initCamera()
{
  //カメラと光源の初期設定
　//光源インスタンスを作成
  light = new Light();
  light.pos = [10, 5, 20, 1];
  //初期設定値をHTMLのフォームに表示
  form1.lightX.value = light.pos[0];
  form1.lightY.value = light.pos[1];
  form1.lightZ.value = light.pos[2];
　//カメラ・インスタンスを作成
  camera = new Camera();
  camera.dist = 10; 
  camera.theta = 5;
  camera.cnt[2] = 0.5;
  camera.fovy = 20;
  camera.getPos();//カメラ位置を計算
  
  mouseOperation(canvas, camera);//swgSupport.js
}  
  
function initObject()
{
  flagStart = false;
  dt = parseFloat(form1.dt.value);//計算時のタイムステップ[s]
  
//  sm1 = new SpringMass1();//1次元バネ質点モデルのオブジェクト
  sm1.numPole = 2;
  sm1.numSpring = parseFloat(form1.numSpring.value);
  sm1.mass = parseFloat(form1.mass.value);
  sm1.constK = parseFloat(form1.constK.value);
  sm1.damping = parseFloat(form1.damping.value);
  sm1.drag = parseFloat(form1.drag.value);
  sm1.totalLen = 5;//全体の長さ(固定）
  sm1.totalLen0 = parseFloat(form1.Length0.value);//全体の自然長
  sm1.frequency = parseFloat(form1.frequency.value);
  sm1.amp = parseFloat(form1.amp.value);

  sm1.numDummy = 50;
  sm1.initialize();
  for(var i = 0; i < sm1.numPoint; i++) sm1.point[i].flagFixed = false;
  onClickBoundary(); 

  //フロア
  floor0 = new Rigid();
  floor0.kind = "CHECK_PLATE";
  floor0.vPos = new Vector3(0.0, 0.0, -plane[3]-0.01);
  floor0.vSize = new Vector3(10, 10, 1);
  floor0.nSlice = 20;//x方向分割数(0.5m/grid)
  floor0.nStack = 20;//y方向分割数
  floor0.col1 = [0.4, 0.3, 0.3, 1.0];
  floor0.col2 = [0.2, 0.2, 0.3, 1.0];
  floor0.specular = [0.1, 0.1, 0.1, 1.0];
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

  sm1.draw(gl);

  var n = floor0.initVertexBuffers(gl);
  floor0.draw(gl, n);

  //影 
  if(shadow_value >= 0.01) drawShadow();    

  function drawShadow()
  {
    gl.depthMask(false);
    gl.blendFunc(gl.SRC_ALPHA_SATURATE,gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.BLEND);
    
    sm1.shadow = shadow_value;
    sm1.draw(gl);
    sm1.shadow = 0;

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
  light.pos[0] = parseFloat(form1.lightX.value);
  light.pos[1] = parseFloat(form1.lightY.value);
  light.pos[2] = parseFloat(form1.lightZ.value);
  display();
}

function onClickStart()
{
  fps = 0;
  elapseTime = 0.0;
  elapseTime1 = 0.0;
  countTrace = 0;
  timeTrace = 0;
  count = 0;
  flagStart = true;
  flagStep = false;
  lastTime = new Date().getTime();
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
  display();
}
function onClickCameraReset()
{
  initCamera();
  display();
}

function onClickShadow()
{
  shadow_value = parseFloat(form1.shadow.value);
  display();
}

function onClickBoundary()
{
  var nn;
  var radio1 = document.getElementsByName("radio1");
  for(var i = 0; i < radio1.length; i++)
  {
     if(radio1[i].checked) nn = i;
  }
  if(nn == 0) {
    sm1.boundary = "B_FIXED";
    sm1.point[0].flagFixed = true;
    sm1.point[sm1.numPoint-1].flagFixed = true;
    sm1.numDummy = 0;
  }
  else if(nn == 1) {
    sm1.boundary = "B_FREE";
    sm1.point[0].flagFixed = false;
    sm1.point[sm1.numPoint-1].flagFixed = false;
    sm1.numDummy = 0;
  }
  else {
    sm1.boundary = "B_NON";
    sm1.point[0].flagFixed = true;
    sm1.point[sm1.numPoint-1].flagFixed = false;
    sm1.numDummy = 50;
  }
}

function onClickMotion()
{
  var nn;
  var radio2 = document.getElementsByName("radio2");
  for(var i = 0; i < radio2.length; i++)
  {
     if(radio2[i].checked) nn = i;
  }
  if(nn == 0) sm1.motion = "TRANSVERSE"; 
  else if(nn == 1) sm1.motion = "LONGITUDE";
  else sm1.motion = "HYBRID";
}

function onClickMode()
{
  if(form1.mode.checked) sm1.mode = "CONTINUOUS";
  else sm1.mode = "SINGLE";
}

