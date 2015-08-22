/*------------------------------------------------
      linear.js
      直線運動
-------------------------------------------------*/
var canvas; //canvas要素
var gl;     //WebGL描画用コンテキスト
var camera; //カメラ
var light;  //光源
var rigid, floor0;
var coord = [];//座標軸表示用
var plane = [0.0, 0.0, 1.0, 0.0];//床平面(z = 0)
var shadow_value = 0.2;

var flagWorld = false;
var flagObject = false;
var flagInertial = false;
var dt;//数値計算時のタイムステップ
//animation
var fps = 0;
var lastTime = new Date().getTime();
var elapseTime = 0.0;//全経過時間
var elapseTime0 = 0.0;
var elapseTime1 = 0.0;
var flagStart = false;
var flagStep = false;
var flagReset = false;
var count = 0;//演算回数（かえる跳び法に必要）
var n_method = 0;
//軌跡点表示
var trace0 = [];//軌跡点座標を保存する配列
var maxTrace = 100;//軌跡点個数の最大値
var countTrace;    //軌跡点個数のカウント

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

  flagQuaternion = false;//trueのままでも結果は同じ
  
  //Canvasをクリアする色を設定し、隠面消去機能を有効にする
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
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
      var vDir = norm(rigid.vVel);//進行方向単位ベクトル
      //加速度（摩擦による減速）
      rigid.vAcc.x = - muK * gravity * vDir.x;
      rigid.vAcc.y = - muK * gravity * vDir.y;
      //速度
      if(n_method == 1 && count == 0)//最初のかえる跳び
      {
        rigid.vVel.x += rigid.vAcc.x * dt / 2; 
        rigid.vVel.y += rigid.vAcc.y * dt / 2; 
      }
      else
      {
        rigid.vVel.x += rigid.vAcc.x * dt; 
        rigid.vVel.y += rigid.vAcc.y * dt; 
      }
      if(rigid.vVel.x * rigid.vVel0.x <= 0.0 && rigid.vVel.y * rigid.vVel0.y <= 0.0)
      {//方向が反転したとき停止
        flagStart = false;
      }
      rigid.vVel0.copy(rigid.vVel);//更新前の値にコピー
      //位置の更新
      rigid.vPos.x += rigid.vVel.x * dt;
      rigid.vPos.y += rigid.vVel.y * dt;
      
      elapseTime0 = elapseTime;//現在の経過時間を保存
      form1.time.value = elapseTime.toString();
      
      if(flagStep) { flagStart = false; } 
      count ++;
      if(countTrace < maxTrace) trace0[countTrace].copy(rigid.vPos);
     
      countTrace ++;
      if(countTrace >= maxTrace) countTrace = 0;
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
  //初期設定値をHTMLのフォームに表示
  form2.lightX.value = light.pos[0];
  form2.lightY.value = light.pos[1];
  form2.lightZ.value = light.pos[2];
　//カメラ・インスタンスを作成
  camera = new Camera();
  camera.dist = 20; 
  camera.cnt[2] = 2.0;
  camera.getPos();//カメラ位置を計算
  
  mouseOperation(canvas, camera);//swgSupport.js
}  
  
function initObject()
{
  flagStart = false;

  dt = parseFloat(form1.dt.value);//計算時のタイムステップ[s]
  muK = parseFloat(form2.muK.value);//動摩擦係数

  //オブジェクトの位置，マテリアルを決定する
  rigid = new Rigid();
  rigid.kind = "CUBE";
  rigid.vSize = new Vector3(1, 1, 1);
  rigid.vPos = new Vector3(0.0, -5.0, rigid.vSize.z / 2);
  var speedX = parseFloat(form2.speedX.value);//初速度[m/s]
  var speedY = parseFloat(form2.speedY.value);//初速度[m/s]
  rigid.vVel = new Vector3(speedX, speedY, 0.0);
  rigid.vVel0.copy(rigid.vVel);　

  rigid.diffuse = [0.0, 0.6, 0.6, 1.0];
  rigid.ambient = [0.0, 0.4, 0.4, 1.0];
  rigid.specular = [0.99, 0.99, 0.99, 1.0];
  rigid.shininess = 100.0;

  //軌跡用オブジェクト
  trace = new Rigid();
  trace.kind = "SPHERE";
  trace.vPos = new Vector3();
  trace.vSize = new Vector3(0.2, 0.2, 0.2);
  trace.ambient = [1, 1, 1, 1];
  trace.nSlice = 6;
  trace.nStack = 6;
　for(var i = 0; i < maxTrace; i++) trace0[i] = new Vector3(1000,0,0);//初期値は遠方

  //座標軸
  var lenCoord = 1.5;//座標軸の長さ
  var widCoord = 0.05;//座標軸の太さ
  for(var i = 0; i < 3; i++) 
  {
    coord[i] = new Rigid();
    coord[i].specular = [0.0, 0.0, 0.0, 1.0];
    coord[i].shininess = 10.0;
    coord[i].nSllice = 8;
  }
  coord[0].diffuse = [0.5, 0.0, 0.0, 1.0];//worldX
  coord[0].ambient = [0.5, 0.0, 0.0, 1.0];//worldX
  coord[1].diffuse = [0.0, 0.5, 0.0, 1.0];//worldY
  coord[1].ambient = [0.0, 0.5, 0.0, 1.0];//worldY
  coord[2].diffuse = [0.0, 0.0, 0.5, 1.0];//worldZ
  coord[2].ambient = [0.0, 0.0, 0.5, 1.0];//worldZ
　//ワールド座標
  coord[0].kind = "CYLINDER_X";
  coord[0].vPos = new Vector3(0.0, 0.0, 0.0);
  coord[0].vSize = new Vector3(lenCoord, widCoord, widCoord);
  coord[1].kind = "CYLINDER_Y";
  coord[1].vSize = new Vector3(widCoord, lenCoord, widCoord);
  coord[1].vPos = new Vector3(0.0, 0.0, 0.0);  
  coord[2].kind = "CYLINDER_Z";
  coord[2].vSize = new Vector3(widCoord, widCoord, lenCoord);
  coord[2].vPos = new Vector3(0.0, 0.0, 0.0);
  for(var i = 0; i < 3; i++) {
    coord[i].vEuler.copy(rigid.vEuler);
  }

  //フロア
  floor0 = new Rigid();
  floor0.kind = "CHECK_PLATE";
  floor0.vPos = new Vector3(0.0, 0.0, -plane[3]-0.01);
  floor0.vSize = new Vector3(20, 20, 1);
  floor0.nSlice = 20;//x方向分割数
  floor0.nStack = 20;//y方向分割数
  floor0.specular = [0.5, 0.5, 0.5, 1.0];
  floor0.shininess = 50;
  floor0.flagCheck = true;

  form2.debug.checked = "";
  form2.trace.checked = "";

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

  //オブジェクトの描画
  var n = rigid.initVertexBuffers(gl);
  rigid.draw(gl, n);
  
  //軌跡用オブジェクト
  if(rigid.flagTrace){
    n = trace.initVertexBuffers(gl);
    for(var i = 0; i < maxTrace; i++) {
      trace.vPos.copy(trace0[i]);
      trace.draw(gl, n);
    }
  }
  
  n = floor0.initVertexBuffers(gl);
  floor0.draw(gl, n);

  if(flagWorld) 
  {
    for(var i = 0; i < 3; i++){
      n = coord[i].initVertexBuffers(gl);
      coord[i].draw(gl, n);
    }
  }

  //影 
  drawShadow();    

  function drawShadow()
  {
    gl.depthMask(false);
    gl.blendFunc(gl.SRC_ALPHA_SATURATE,gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.BLEND);
    rigid.shadow = shadow_value;
    n = rigid.initVertexBuffers(gl);
    rigid.draw(gl, n);
    rigid.shadow = 0;//影描画後は元に戻す
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
function onClick_method()
{
  var radio1 =  document.getElementsByName("radio1");
  for(var i = 0; i < radio1.length; i++)
  {
     if(radio1[i].checked) n_method = i;
  }
  initObject();
}

function onClick_dt()
{
  initObject();
}

function onClick_speed()
{
  initObject();
}


function onClick_muK()
{
  initObject();
}

function onClick_mass()
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
function onClickCoord()
{
  if(form2.world.checked) flagWorld = true;
  else                    flagWorld = false;
  display();
}

function onClickStart()
{
  fps = 0;
  elapseTime = elapseTime0;
  elapseTime = 0.0;
  elapseTime1 = 0.0;
  count = 0;
  countTrace = 0;
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

function onClickDebug()
{
  if(form2.debug.checked) rigid.flagDebug = true;
  else                    rigid.flagDebug = false;
  display(); 
}

function onClickTrace()
{
  if(form2.trace.checked) rigid.flagTrace = true;
  else                    rigid.flagTrace = false;
  display(); 
}
