/*------------------------------------------------------
    oscillationOfCylinder.js
    3次元弾性体(円柱）の振動
-------------------------------------------------------*/
var canvas; //canvas要素
var gl;     //WebGL描画用コンテキスト
var camera; //カメラ
var light;  //光源
var sm3;//3次元バネ質点モデルのインスタンス
var floor0;
var plane = [0.0, 0.0, 1.0, 0.0];//床平面(z = 0)
var shadow_value = 0.2;

//数値計算のタイムステップ
var dt;
var force = 1;//外力
var forceFreq = 0;//その振動数
var oscillationType = "FREE";
var oscillationDir = "Y_DIR";//水平
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
  
  sm3 = new SpringMass3();//2次元バネ質点モデルのオブジェクト
  springMass = sm3;//springMassはswgSupportSM.jsで使用するオブジェクト名
  
  //Canvasをクリアする色を設定し、隠面消去機能を有効にする
  gl.clearColor(0.2, 0.3, 0.4, 1.0);
  gl.enable(gl.DEPTH_TEST);
  
  readyTexture();
  initCamera();
  initObject();

  var maxValue = -10;
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
      var t = elapseTime;
      for(var k = 0; k < sm3.numPoint; k++)
      {
        if(oscillationType == "FREE")
        {
          if(oscillationDir == "Y_DIR")
          {
            if(t < 5){ sm3.point[k].vForce0.y = force * t ;}
            else     { sm3.point[k].vForce0.y = 0;}
          }
          else
          {
            if(t < 5){ sm3.point[k].vForce0.z = force * t ;}
            else     { sm3.point[k].vForce0.z = 0;}
          }
        }
        else//強制振動
        {
          if(oscillationDir == "Y_DIR") 
          {
            sm3.point[k].vForce0.y = force * Math.sin(2 * Math.PI* forceFreq * t);
          }
          else 
          {
            sm3.point[k].vForce0.z = force * Math.sin(2 * Math.PI* forceFreq * t);
          }
        }
      }
      
	  var tt = dt / 10.0;
      for(var j = 0; j < 10; j++)
      {
        sm3.calcSpringMass3(tt);
	  }

	  //周期の計測
	  if(oscillationType == "FREE")
	  {
	    if(oscillationDir == "Y_DIR")
	    {
	      if(sm3.point[0].vVel.y > 0.0)
	      {
		    if(maxValue < sm3.point[0].vPos.y)
            { 
		      maxValue = sm3.point[0].vPos.y; 
		      t2 = elapseTime;
		      period = t2 - t1;
	        }
	      }
          else{  maxValue = -10; t1 = t2; }
        }
	    else if(oscillationDir == "Z_DIR")
	    {
	      if(sm3.point[0].vVel.z > 0.0)
	      {
		    if(maxValue < sm3.point[0].vPos.z)
            { 
		      maxValue = sm3.point[0].vPos.z; 
		      t2 = elapseTime;
		      period = t2 - t1;
	        }
	      }
          else{  maxValue = -10; t1 = t2; }
        }
      
        //振動数
        var freq = 1 / period;
	    //振動数の表示
　　　  form2.forceFreq.value = freq.toString();
      }
      elapseTime0 = elapseTime;//現在の経過時間を保存
      form1.time.value = elapseTime.toString();//経過時間を表示
      
      if(flagStep) { flagStart = false; } 

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
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
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

//-------------------------------------------------------------------
function initObject()
{
  flagStart = false;
  dt = parseFloat(form1.dt.value);//計算時のタイムステップ[s]
  
  sm3.kind = "CYLINDER";
  sm3.numCol = parseFloat(form1.numCol.value);
  sm3.numStk = parseFloat(form1.numStk.value);
  sm3.mass = parseFloat(form2.mass.value);
  sm3.structK = sm3.shearK = parseFloat(form2.constK.value);
  sm3.damping = parseFloat(form2.damping.value);
  sm3.drag = parseFloat(form2.drag.value);
  sm3.vSize = new Vector3(0.5, 0.5, 2);//弾性立方体のサイズ
  sm3.vEuler = new Vector3(0, 0, 0);
  sm3.vPos = new Vector3(0, 0, sm3.vSize.z / 2);//最初の質点の位置
  force = parseFloat(form2.force.value);//風速
  forceFreq = parseFloat(form2.forceFreq.value);//振動数

  sm3.initialize();
  //フロア上の質点を固定
  var m;
  for(m = 0; m < sm3.numPoint; m++)
  {
    if(sm3.point[m].vPos.z < sm3.radius + 0.01) sm3.point[m].flagFixed = true;
  }
    
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

  onClickDisp();
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
  if(sm3.dispType == "TEX") {
    gl.activeTexture(gl.TEXTURE0);
    gl.uniform1i(samplerLoc, 0);
  } 
  //2次元弾性体の表示
  sm3.draw(gl);

  n = floor0.initVertexBuffers(gl);
  floor0.draw(gl, n);

  //影 
  if(shadow_value >= 0.1) drawShadow();    

  function drawShadow()
  {
    gl.depthMask(false);
    gl.blendFunc(gl.SRC_ALPHA_SATURATE,gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.BLEND);
    
    sm3.shadow = shadow_value;
    sm3.draw(gl);
    sm3.shadow = 0;

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

function onClickType()
{
  var nn;
  var radio4 = document.getElementsByName("radio4");
  for(var i = 0; i < radio4.length; i++)
  {
     if(radio4[i].checked) nn = i;
  }
  if(nn == 0)      oscillationType = "FREE";
  else if(nn == 1) oscillationType = "FORCED";
  initObject();
}   

function onClickDir()
{
  var nn;
  var radio5 = document.getElementsByName("radio5");
  for(var i = 0; i < radio5.length; i++)
  {
     if(radio5[i].checked) nn = i;
  }
  if(nn == 0)      oscillationDir = "Y_DIR";
  else if(nn == 1) oscillationDir = "Z_DIR";
  initObject();
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
  if(nn == 0)      sm3.dispType = "SMM";
  else if(nn == 1) sm3.dispType = "TEX";
  else             sm3.dispType = "CHECK";
  display();
}   

function onClickShear()
{
  if(form2.shearDisp.checked) sm3.flagShearDisp = true;
  else sm3.flagShearDisp = false;
  display();
}

function onClickCollision()
{
  if(form2.collision.checked) sm3.flagCollision = true;
  else sm3.flagCollision = false;
}
function onClickDebug()
{
  if(form2.debug.checked) flagDebug = true;
  else                    flagDebug = false;
  
  sm3.object.flagDebug = flagDebug;
  display();
}
function onChangeForce()
{
  force = parseFloat(form2.force.value);//風速
} 
function onChangeFreq()
{
  forceFreq = parseFloat(form2.forceFreq.value);//振動数
} 

