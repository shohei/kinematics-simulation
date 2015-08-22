/*-----------------------------------------------
    projectile.js
　回転を考慮しない放物運動
------------------------------------------------*/
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

var speed0, angle0;
var dt, DIA, gammaI;
var resistanceNo = 0;
//物理定数
var gravity = 9.8;//重力加速度[m/s^2] 
//animation
var fps = 0;
var lastTime = new Date().getTime();
var elapseTime = 0.0;//全経過時間
var elapseTime0 = 0.0;
var elapseTime1 = 0.0;
var flagStart = false;
var flagStep = false;
var flagReset = false;
//軌跡データ用
var flagTrace = false;
var trace0 = [];    //軌跡配列
var maxTrace = 100; //軌跡点個数の最大値
var countTrace = 0; //軌跡点個数のカウント
var periodTrace = 0.1;//軌跡点を表示する時間間隔
var timeTrace = 0;    //その経過時間

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
  rigid = new Rigid();

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
      var speed = mag(rigid.vVel);
      var vAcc = mul(-gammaI*speed, rigid.vVel);
      vAcc.z -= gravity;
      rigid.vVel.add(mul(vAcc, dt));
      rigid.vPos.add(mul(rigid.vVel, dt));

      if(rigid.vPos.z < DIA / 2) rigid.vPos.z = DIA / 2;
      //床面に衝突
      if(rigid.vVel.z < 0.0 && rigid.vPos.z <= DIA / 2) rigid.vVel.z *= - restitution;
      
      elapseTime0 = elapseTime;//現在の経過時間を保存
      form1.time.value = elapseTime.toString();
      
      if(flagStep) { flagStart = false; } 
      
      //軌跡データ作成
      if(timeTrace == 0) 
      {
        trace0[countTrace].copy(rigid.vPos);
        countTrace ++;
        if(countTrace >= maxTrace) countTrace = 0;
      }
      timeTrace += dt;
      if(timeTrace >= periodTrace) timeTrace = 0;

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
  periodTrace = parseFloat(form2.periodTrace.value);

  dt = parseFloat(form1.dt.value);//計算時のタイムステップ[s]
  var dia = parseFloat(form2.dia.value);//空気抵抗を計算するときの直径
  DIA = 10 * dia;//見かけの直径
  var mass = parseFloat(form2.mass.value);
  var A = Math.PI * dia * dia / 4;//球断面積
  var rho = 1.2;//20°Cの空気に対する密度[kg/m^3]
  var Ci = 0.5 * rho * A;
//alert("Ci = " + Ci); 
  if(flagDrag) gammaI = Ci / mass; //慣性抵抗
  else gammaI = 0;//無抵抗
  restitution = parseFloat(form2.restitution.value);

  //オブジェクトの位置，マテリアルを決定する
  //座標軸オブジェクト
  rigid.kind = "SPHERE";//球だけ
  rigid.vPos = new Vector3(0.0, -5.0, parseFloat(form2.height.value));
  speed0 = parseFloat(form2.speed0.value);//初速度[m/s]
  angle0 = parseFloat(form2.angle0.value);//放射角度[deg]
  rigid.vSize = new Vector3(DIA, DIA, DIA);
  rigid.vVel.x = 0.0;　
  rigid.vVel.y = speed0 * Math.cos(Math.PI * angle0 / 180.0);//水平軸
  rigid.vVel.z = speed0 * Math.sin(Math.PI * angle0 / 180.0);//鉛直軸
  rigid.vAcc = new Vector3(0.0, 0.0, -gravity);
  rigid.nSlice = 16;
  rigid.nStack = 16;

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
  var lenCoord = 1.0;
  var widCoord = 0.05;

  for(var i = 0; i < 9; i++) 
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
  coord[3].diffuse = [1.0, 0.0, 0.0, 1.0];//objectX
  coord[3].ambient = [1.0, 0.0, 0.0, 1.0];//objectX
  coord[4].diffuse = [0.0, 1.0, 0.0, 1.0];//objectY
  coord[4].ambient = [0.0, 1.0, 0.0, 1.0];//objectY
  coord[5].diffuse = [0.0, 0.0, 1.0, 1.0];//objectZ
  coord[5].ambient = [0.0, 0.0, 1.0, 1.0];//objectZ
  coord[6].diffuse = [1.0, 1.0, 0.0, 1.0];//inertialX
  coord[6].ambient = [1.0, 1.0, 0.0, 1.0];//inertialX
  coord[7].diffuse = [0.0, 1.0, 1.0, 1.0];//inertialY
  coord[7].ambient = [0.0, 1.0, 1.0, 1.0];//inertialY
  coord[8].diffuse = [1.0, 0.0, 1.0, 1.0];//inertialZ
  coord[8].ambient = [1.0, 0.0, 1.0, 1.0];//inertialZ
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

  //フロア
  floor0 = new Rigid();
  floor0.kind = "CHECK_PLATE";
  floor0.vPos = new Vector3(0.0, 0.0, -plane[3]-0.01);
  floor0.vSize = new Vector3(40, 40, 20);
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
  if(flagTrace){
    n = trace.initVertexBuffers(gl);
    for(var i = 0; i < maxTrace; i++) {
      trace.vPos.copy(trace0[i]);
      trace.draw(gl, n);
    }
  }

  if(flagWorld) 
  {
    for(var i = 0; i < 3; i++)
    {
      n = coord[i].initVertexBuffers(gl);
      coord[i].draw(gl, n);
    }
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

function onClick_dt()
{
  initObject();
}

function onClickDrag()
{
  if(form2.drag.checked) flagDrag = true;
  else flagDrag = false;
  initObject();
}

function onClick_height()
{
  initObject();
}

function onClick_speed()
{
  initObject();
}

function onClick_angle()
{
  initObject();
}

function onClick_dia()
{
  initObject();
}

function onClick_restitution()
{
  initObject();
}

function onClick_mass()
{
  initObject();
}

function onChangeSpace()
{
  var radioS =  document.getElementsByName("radioS");
  for(var i = 0; i < radioS.length; i++)
  {
     if(radioS[i].checked) spaceNo = i;
  }
  display();
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
  countTrace = 0;
  timeTrace = 0;

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

function onClickTrace()
{
  flagTrace = form2.trace.checked;
  display(); 
}
function onClickPeriod()
{
  periodTrace = parseFloat(form2.period.value);
}
