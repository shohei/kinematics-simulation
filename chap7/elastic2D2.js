/*------------------------------------------------------
    elastic2D2.js
    バネ-質点モデルによる2次元弾性体の表現
    剛体球と2次元弾性体の衝突
-------------------------------------------------------*/
var canvas; //canvas要素
var gl;     //WebGL描画用コンテキスト
var camera; //カメラ
var light;  //光源
var sm2;//2次元バネ質点モデルのインスタンス

var floor0;
var plane = [0.0, 0.0, 1.0, 0.0];//床平面(z = 0)
var shadow_value = 0.2;

//数値計算のタイムステップ
var dt;
var windVelY = 1;
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
  
  sm2 = new SpringMass2();//2次元バネ質点モデルのオブジェクト
  springMass = sm2;//springMassはswgSupportSM.jsで使用するオブジェクト名
  
  //Canvasをクリアする色を設定し、隠面消去機能を有効にする
  gl.clearColor(0.2, 0.3, 0.5, 1.0);
  gl.enable(gl.DEPTH_TEST);
  
  readyTexture();
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
   
	  var tt = dt / 10.0;
      for(var j = 0; j < 10; j++)
      {
        sm2.calcSpringMass2(tt);
        sm2.rigid2.action3D(tt);
        collisionSMwithR(sm2, tt);//collisionSM_R.js
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
  form2.lightX.value = light.pos[0];
  form2.lightY.value = light.pos[1];
  form2.lightZ.value = light.pos[2];
　//カメラ・インスタンスを作成
  camera = new Camera();
  camera.dist = 10; 
  camera.theta = 10;
  camera.cnt[2] = 1.0;
  camera.fovy = 20;
  camera.getPos();//カメラ位置を計算
  
  mouseOperation(canvas, camera);//swgSupport.js
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
  for(var i = 0; i < 2; i++) image[i] = new Image();
  image[0].src = '../imageJPEG/tiger.jpg';
  //image[0].src = '../imageJPEG/check3.jpg';
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
//-------------------------------------------------------------------
function initObject()
{
  flagStart = false;
  dt = parseFloat(form1.dt.value);//計算時のタイムステップ[s]
  
  sm2.numPole = 8;
  sm2.numRow = sm2.numCol = parseFloat(form2.numSpring.value);
  sm2.mass = parseFloat(form2.mass.value);
  sm2.structK = sm2.shearK = parseFloat(form2.constK.value);
  sm2.hingeK = parseFloat(form2.hingeK.value);
  sm2.damping = parseFloat(form2.damping.value);
  sm2.drag = parseFloat(form2.drag.value);
  sm2.totalLenX = sm2.totalLenY = 2;//全体の長さ(固定）
  var totalLen0 = parseFloat(form2.totalLen0.value);//全体の自然長
  sm2.lengthX0 = totalLen0 / sm2.numRow;
  sm2.lengthY0 = totalLen0 / sm2.numCol;
  sm2.vEuler = new Vector3(0, 0, 0);
  sm2.height0 = 0.8;
  sm2.vPos = new Vector3(-sm2.totalLenX/2, -sm2.totalLenY/2, sm2.height0);//最初の質点の位置
  sm2.initialize();
  for(var i = 0; i < sm2.numPole; i++){ sm2.pole[i].ready(); sm2.pole[i].q = getQFromEulerXYZ(sm2.pole[i].vEuler); }
   
  for(var i = 0; i < sm2.numPoint; i++) sm2.point[i].flagFixed = false;
  //辺の質点をのポールに固定
  for(var i = 0; i <= sm2.numRow; i++) sm2.point[i].flagFixed = true;
  for(var i = 0; i <= sm2.numRow; i++) sm2.point[i+sm2.numCol*(sm2.numRow+1)].flagFixed = true;
  for(var j = 0; j <= sm2.numCol; j++) sm2.point[j*(sm2.numRow+1)].flagFixed = true;
  for(var j = 0; j <= sm2.numCol; j++) sm2.point[sm2.numRow+j*(sm2.numRow+1)].flagFixed = true;

  //質点と衝突する剛体
  sm2.rigid2 = new Rigid();
  sm2.rigid2.kind = "SPHERE";
  sm2.rigid2.nSlice = 10;
  sm2.rigid2.nStack = 10;
  sm2.rigid2.mass = 0.2;
  sm2.rigid2.flagTexture = true;
  sm2.rigid2.vSize = new Vector3(0.7, 0.7, 0.7);
  sm2.rigid2.vPos = new Vector3(0.0, 0.0, 2.0);
  sm2.rigid2.ready();//calcMomentOfInertia();
  //質点の慣性モーメントの逆数（同じ値の対角行列なのでスカラ）
  sm2.inertialInverse = 10.0 / (4.0 * sm2.radius * sm2.radius * sm2.mass);
  
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


  var samplerLoc = gl.getUniformLocation(gl.program, 'u_sampler');
  if(sm2.dispType == "TEX") {
    gl.activeTexture(gl.TEXTURE0);
    gl.uniform1i(samplerLoc, 0);
  } 

  //2次元弾性体の表示
  sm2.draw(gl);

  //衝突剛体の表示
  gl.activeTexture(gl.TEXTURE1);
  gl.uniform1i(samplerLoc, 1);
  flagQuaternion = true;
  var n = sm2.rigid2.initVertexBuffers(gl);
  sm2.rigid2.draw(gl, n);
  flagQuaternion = false;

  n = floor0.initVertexBuffers(gl);
  floor0.draw(gl, n);
  
  var dummy = new Rigid();
  dummy.nSlice = 3;
  dummy.nStack = 3;
  n = dummy.initVertexBuffers(gl);


  //影 
  if(shadow_value >= 0.1) drawShadow();    

  function drawShadow()
  {
    gl.depthMask(false);
    gl.blendFunc(gl.SRC_ALPHA_SATURATE,gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.BLEND);
    
    sm2.shadow = shadow_value;
    sm2.draw(gl);
    sm2.rigid2.shadow = shadow_value;
    n = sm2.rigid2.initVertexBuffers(gl);
    sm2.rigid2.draw(gl, n);
    sm2.shadow = sm2.rigid2.shadow = 0;

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

function onChangeLen0()
{
  var totalLen0 = parseFloat(form2.totalLen0.value);//全体の自然長
  sm2.lengthX0 = totalLen0 / sm2.numRow;
  sm2.lengthY0 = totalLen0 / sm2.numCol;
} 

function onClickLight()
{
  light.pos[0] = parseFloat(form2.lightX.value);
  light.pos[1] = parseFloat(form2.lightY.value);
  light.pos[2] = parseFloat(form2.lightZ.value);
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

function onClickMouse()
{
  var nn;
  var radio1 = document.getElementsByName("radio1");
  for(var i = 0; i < radio1.length; i++)
  {
     if(radio1[i].checked) nn = i;
  }
  if(nn == 0) m_flagObject = false;
  else if(nn == 1) { m_flagObject = true; m_rigidNo = 0; }//point[0]は仮の質点
  else {m_flagObject = true; m_rigidNo = 1; }
  mouseOperation(canvas, camera);
}

function onClickPlane()
{
  var nn;
  var radio2 = document.getElementsByName("radio2");
  for(var i = 0; i < radio2.length; i++)
  {
     if(radio2[i].checked) nn = i;
  }
  if(nn == 0) mousePlane = "MP_XY";
  else if(nn == 1) mousePlane = "MP_YZ";
  else mousePlane = "MP_XZ";
  mouseOperation(canvas, camera);  
}

function onClickDisp()
{
  var nn;
  var radio3 = document.getElementsByName("radio3");
  for(var i = 0; i < radio3.length; i++)
  {
     if(radio3[i].checked) nn = i;
  }
  if(nn == 0)      sm2.dispType = "SMM";
  else if(nn == 1) sm2.dispType = "TEX";
  else             sm2.dispType = "CHECK";
  display();
}   

function onClickShear()
{
  if(form2.shearDisp.checked) sm2.flagShearDisp = true;
  else sm2.flagShearDisp = false;
  display();
}

function onClickCollision()
{
  if(form2.collision.checked) sm2.flagCollision = true;
  else sm2.flagCollision = false;
}
function onClickDebug()
{
  if(form2.debug.checked) flagDebug = true;
  else                    flagDebug = false;
  
  sm2.object.flagDebug = flagDebug;
  for(var i = 0; i < sm2.numPole; i++) sm2.pole[i].flagDebug = flagDebug;
  sm2.rigid2.flagDebug = flagDebug;
  display();
}

