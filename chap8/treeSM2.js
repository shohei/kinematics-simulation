/*------------------------------------------------------
    treeSM2.js
    バネ－質点モデルによる樹木表現
-------------------------------------------------------*/
var canvas; //canvas要素
var gl;     //WebGL描画用コンテキスト
var camera; //カメラ
var light;  //光源
var sm = [];//木バネ質点モデルのインスタンス
var floor0;
var plane = [0.0, 0.0, 1.0, 0.0];//床平面(z = 0)
var shadow_value = 0.2;

//数値計算のタイムステップ
var dt;
var windVel = 0.1;//ｙ方向風速
var windFreq = 1.0;//その振動数
var windGrad = 0.1;//風速の勾配
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
  
  sm[0] = new SpringMassTree();//バネ質点モデルよる樹木オブジェクト
  sm[1] = new SpringMassTree();//バネ質点モデルよる樹木オブジェクト
  
  springMass = sm[0];//springMassはswgSupportSM.jsで使用するオブジェクト名
  
  //Canvasをクリアする色を設定し、隠面消去機能を有効にする
  gl.clearColor(0.8, 0.8, 0.9, 1.0);
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
      form1.fps.value = 2*fps.toString(); //1秒間隔で表示
      var timestep = 0.5 / fps;
      form1.step.value = timestep.toString();
      fps = 0;
      elapseTime1 = 0.0;
    }
    lastTime = currentTime;

    if(flagStart)
    {
      var t = elapseTime;
      //初期設定値（風などの外力）
      for(var i = 0; i < 2; i++){
      for(var k = 0; k < sm[i].numPoint; k++)
      {
        var f= 0.1 * windVel * (1 - windGrad * sm[i].point[k].vPos.y);
        if(f < 0) f = 0;
        var wind = 0.1 * Math.sin(2.0 * Math.PI * windFreq * t);
		sm[i].point[k].vForce0.x = f * wind;
		sm[i].point[k].vForce0.y = f * (1 + wind);
      }
      }
   
	  var tt = dt / 10.0;
      for(var j = 0; j < 10; j++) { sm[0].motion(tt); sm[1].motion(tt); }

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
　//カメラ・インスタンスを作成
  camera = new Camera();
  camera.dist = 15; 
  camera.theta = 10;
  camera.cnt[2] = 1.5;
  camera.fovy = 20;
  camera.getPos();//カメラ位置を計算
  
  mouseOperation(canvas, camera);//swgSupport.js
}  
//-------------------------------------------------------------------
function initObject()
{
  flagStart = false;
  dt = parseFloat(form1.dt.value);//計算時のタイムステップ[s]
  windVel = parseFloat(form2.winVel.value);//風速
  windFreq = parseFloat(form2.winFreq.value);//振動数
  windGrad = parseFloat(form2.gradient.value);//勾配
  
  for(var i = 0; i < 2; i++)
  {
    sm[i].mass = parseFloat(form2.mass.value);
    sm[i].structK0 = sm[i].shearK = parseFloat(form2.constK.value);//せん断バネと構造バネは同じバネ定数としている
    sm[i].drctnK0 = parseFloat(form2.drctnK.value);
    sm[i].damping = parseFloat(form2.damping.value);
    sm[i].drag = parseFloat(form2.drag.value);
    sm[i].variation = parseFloat(form2.variation.value);
    sm[i].numTrunk = parseFloat(form2.trunk.value);
    sm[i].numBranch0 = parseFloat(form2.branch0.value);
    sm[i].numBranch = parseFloat(form2.branch.value);

    sm[i].alpha = parseFloat(form2.alpha.value) * DEG_TO_RAD;
    sm[i].beta = parseFloat(form2.beta.value) * DEG_TO_RAD;
    sm[i].rate = parseFloat(form2.rate.value);
    sm[0].vPos = new Vector3(0, -1.25, 0);//根の質点の位置
    sm[1].vPos = new Vector3(0, 1.25, 0);//根の質点の位置
    sm[i].create();
  }
  sm[0].point[0].flagFixed = true;
  sm[1].point[0].flagFixed = true;

  //フロア
  floor0 = new Rigid();
  floor0.kind = "CHECK_PLATE";
  floor0.vPos = new Vector3(0.0, 0.0, -plane[3]-0.01);
  floor0.vSize = new Vector3(10, 10, 1);
  floor0.nSlice = 20;//x方向分割数(0.5m/grid)
  floor0.nStack = 20;//y方向分割数
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
  sm[0].draw(gl);
  sm[1].draw(gl);

  var n = floor0.initVertexBuffers(gl);
  floor0.draw(gl, n);

  //影 
  if(shadow_value >= 0.01) drawShadow();    

  function drawShadow()
  {
    gl.depthMask(false);
    gl.blendFunc(gl.SRC_ALPHA_SATURATE,gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.BLEND);
    
    sm[0].shadow = sm[1].shadow = shadow_value;
    sm[0].draw(gl); sm[1].draw(gl);
    sm[0].shadow =  sm[1].shadow = 0;

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

function onChangeVel()
{
  windVel = parseFloat(form2.winVel.value);//風速
} 
function onChangeFreq()
{
  windFreq = parseFloat(form2.winFreq.value);//振動数
} 
function onChangeGrad()
{
  windGrad = parseFloat(form2.gradient.value);//風速
} 

function onClickDisp()
{
  var nn;
  var radio3 = document.getElementsByName("radio3");
  for(var i = 0; i < radio3.length; i++)
  {
     if(radio3[i].checked) nn = i;
  }
  if(nn == 0)      sm[0].dispType = sm[1].dispType = "SMM";
  else if(nn == 1) sm[0].dispType = sm[1].dispType = "LP";
  else             sm[0].dispType = sm[1].dispType = "MIX";
  display();
}   

function onClickStart()
{
  fps = 0;
  elapseTime = 0.0;
  elapseTime1 = 0.0;
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
  shadow_value = parseFloat(form2.shadow.value);
  display();
}
