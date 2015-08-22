/*---------------------------------------------------
     action2D.js
     鉛直軸回転を含む直線運動
---------------------------------------------------*/
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
var dt = 0.02;//数値計算時のタイムステップ
//animation
var fps = 0;
var lastTime = new Date().getTime();
var elapseTime = 0.0;//全経過時間
var elapseTime0 = 0.0;
var elapseTime1 = 0.0;
var flagStart = false;
var flagStep = false;
var flagReset = false;
//軌跡点表示
var trace0 = [];//軌跡点座標を保存する配列
var maxTrace = 100;//軌跡点個数の最大値
var countTrace;    //軌跡点個数のカウント
var flagLinearStop = false;
var flagRotationStop = false;

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

  //Canvasをクリアする色を設定し、隠面消去機能を有効にする
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.enable(gl.DEPTH_TEST);
  initCamera();
  initObject();
  
  var animate = function()
  {
    //繰り返し呼び出す関数を登録
    requestAnimationFrame(animate, canvas); 
    //時間計測
    var currentTime = new Date().getTime();
    var frameTime = (currentTime - lastTime) / 1000.0;
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
      //直線運動
      var vDir = norm(rigid.vVel);//進行方向単位ベクトル
      //摩擦力
      rigid.vForce.x = - muK * gravity * rigid.mass * vDir.x;
      rigid.vForce.y = - muK * gravity * rigid.mass * vDir.y;
      rigid.vAcc.x = rigid.vForce.x / rigid.mass;
      rigid.vAcc.y = rigid.vForce.y / rigid.mass;
      
      rigid.vVel.x += rigid.vAcc.x * dt; 
      rigid.vVel.y += rigid.vAcc.y * dt; 

      if(rigid.vVel.x * rigid.vVel0.x <= 0.0 && rigid.vVel.y * rigid.vVel0.y <= 0.0) 
      { //方向が反転したとき直進運動を止める
        rigid.vVel = new Vector3(); 
        flagLinearStop = true; 
       }
      rigid.vVel0.copy(rigid.vVel);//更新前の値にコピー
      rigid.vPos.x += rigid.vVel.x * dt;
      rigid.vPos.y += rigid.vVel.y * dt;
     
      //-----回転運動-----
      var vDirRot = norm(rigid.vOmega);//回転軸（慣性空間）
console.log("vOmega x = " + rigid.vOmega.x + " y = " + rigid.vOmega.y + " z = " + rigid.vOmega.z);
console.log("vDirRot x = " + vDirRot.x + " y = " + vDirRot.y + " z = " + vDirRot.z);
       //減速トルク
      rigid.vTorque.z = - dampRotation * rigid.vSize.x * rigid.mass * muK * vDirRot.z;
      //角速度とトルクをオブジェクト座標系に変換
      var vOmegaObj = qvRotate(conjugate(rigid.q), rigid.vOmega);
      var vTorqueObj = qvRotate(conjugate(rigid.q), rigid.vTorque);
      var cs = cross(vOmegaObj, mulMV(rigid.mInertia, vOmegaObj));
      //角加速度（オブジェクト座標系）
      rigid.vAlpha = mulMV(rigid.mInertiaInverse, sub(vTorqueObj, cs));
      //角加速度を慣性座標系にもどし角速度を更新
      rigid.vOmega.add(qvRotate(rigid.q, mul(rigid.vAlpha, dt)));

      if(rigid.vOmega.z * rigid.vOmega0.z <= 0.0) 
      { 
        rigid.vOmega = new Vector3(); 
        flagRotationStop = true;
      }
      rigid.vOmega0.copy(rigid.vOmega);//更新前の値にコピー

      var qq = mulVQ(rigid.vOmega, rigid.q); 
      rigid.q.add(mulQS(qq, (0.5 * dt)));
      rigid.q.norm();
      //----回転運動終了------
      
      elapseTime0 = elapseTime;//現在の経過時間を保存
      form1.time.value = elapseTime.toString();
      
      if(flagStep) { flagStart = false; } 
      if(countTrace < maxTrace) trace0[countTrace].copy(rigid.vPos);
      if(!flagLinearStop) countTrace ++;
      if(countTrace >= maxTrace) countTrace = 0;
      //直線運動と回転運動がどちらも停止
      if(flagLinearStop && flagRotationStop) flagStart = false;
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
  dampRotation =  parseFloat(form2.dampRot.value);//回転減速係数

  //オブジェクトの位置，マテリアルを決定する
  rigid = new Rigid();
  rigid.kind = "CUBE";
  //rigid.kind = "CYLINDER";
  rigid.vSize = new Vector3(1, 1, 1);
  rigid.vPos = new Vector3(0.0, -5.0, rigid.vSize.z / 2);
  //rigid.vPos0 = new Vector3(0.0, -5.0, rigid.vSize.z / 2);//初期設定
  var speedX = parseFloat(form2.speedX.value);//初速度[m/s]
  var speedY = parseFloat(form2.speedY.value);//初速度[m/s]
  rigid.vVel = new Vector3(speedX, speedY, 0.0);
  rigid.vVel0.copy(rigid.vVel);　
//  rigid.vOmega.z = 360 * DEG_TO_RAD;//[rad/s]
  rigid.vOmega.z = parseFloat(form2.omega.value) * Math.PI * 2;//360 * DEG_TO_RAD;//[rad/s]
  rigid.vOmega0.z = rigid.vOmega.z;//更新前
  rigid.diffuse = [0.0, 0.6, 0.6, 1.0];
  rigid.ambient = [0.0, 0.4, 0.4, 1.0];
  rigid.specular = [0.99, 0.99, 0.99, 1.0];
  rigid.shininess = 100.0;
  rigid.nSlice = 10;//x方向分割数
  rigid.nStack = 10;//y方向分割数
  rigid.mass = 1;
  rigid.calcMomentOfInertia();

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
  for(var i = 0; i < 9; i++) 
  {
    coord[i] = new Rigid();
    coord[i].specular = [0.0, 0.0, 0.0, 1.0];
    coord[i].shininess = 10.0;
    coord[i].nSllice = 6;
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
  //オブジェクト座標
  coord[3].kind = "CYLINDER_X";
  coord[3].vSize = new Vector3(lenCoord, widCoord, widCoord);
  coord[3].vPos = rigid.vPos;//x
  coord[4].kind = "CYLINDER_Y";
  coord[4].vSize = new Vector3(widCoord, lenCoord, widCoord);
  coord[4].vPos = rigid.vPos;//y
  coord[5].kind = "CYLINDER_Z";
  coord[5].vSize = new Vector3(widCoord, widCoord, lenCoord);
  coord[5].vPos = rigid.vPos;//z
  //慣性座標
  coord[6].kind = "CYLINDER_X";
  coord[6].vSize = new Vector3(lenCoord, widCoord, widCoord);
  coord[6].vPos = rigid.vPos;//x
  coord[7].kind = "CYLINDER_Y";
  coord[7].vSize = new Vector3(widCoord, lenCoord, widCoord);
  coord[7].vPos = rigid.vPos;//y
  coord[8].kind = "CYLINDER_Z";
  coord[8].vSize = new Vector3(widCoord, widCoord, lenCoord);
  coord[8].vPos = rigid.vPos;//z
  for(var i = 3; i < 6; i++) {
    coord[i].vEuler.copy(rigid.vEuler);
    coord[i].q = getQFromEulerXYZ(coord[i].vEuler);
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

  //オブジェクト座標と慣性座標の位置
  for(i = 3; i < 9; i++) coord[i].vPos = rigid.vPos;

  if(flagWorld) 
  {
    for(var i = 0; i < 3; i++){
      n = coord[i].initVertexBuffers(gl);
      coord[i].draw(gl, n);
    }
  }
  if(flagObject)
  {
    for(var i = 3; i < 6; i++){
      coord[i].q.copy(rigid.q);
      n = coord[i].initVertexBuffers(gl);
      coord[i].draw(gl, n);
    }
  }
  if(flagInertial)
  {
    for(var i = 6; i < 9; i++){
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

function onClick_dt()
{
  initObject();
}

function onClick_speed()
{
  initObject();
}
function onClick_omega()
{
  initObject();
}


function onClick_muK()
{
  initObject();
}
function onClick_dampRot()
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
  if(form2.c_object.checked) flagObject = true;
  else                     flagObject = false;
  if(form2.inertial.checked) flagInertial = true;
  else                    flagInertial = false;
  display();
}

function onClickStart()
{
  fps = 0;
  elapseTime = elapseTime0;
  elapseTime = 0.0;
  elapseTime1 = 0.0;
  countTrace = 0;
  flagStart = true;
  flagStep = false;
  flagLinearStop = false;
  flagRotationStop = false;
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
