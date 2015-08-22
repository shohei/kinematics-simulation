/*-----------------------------------------------
     rotating.js
     回転アニメーション
------------------------------------------------*/
var canvas; //canvas要素
var gl;     //WebGL描画用コンテキスト
var camera; //カメラ
var light;  //光源
var rigid, floor0, dog;//表示オブジェクト
var objectNo = 0;//表示オブジェクト識別番号
var coord = [];//座標軸表示用
var flagWorld = false;
var flagObject = false;
var flagInertial = false;
var spaceNo = 0;
//次の2個は影表示に使用
var plane = [0.0, 0.0, 1.0, 0.0];//床平面(z = 0)
var shadow_value = 0.2;
//animation
var fps ; //フレームレート
var lastTime;
var elapseTime = 0.0;//全経過時間
var elapseTime0 = 0.0;
var elapseTime1 = 0.0;
var flagStart = false;
var flagStep = false;
var flagReset = false;
var angleStep = 45.0;//1秒間の回転角度(回転速度、角速度)

function webMain() 
{
  // Canvas要素を取得する
  canvas = document.getElementById('WebGL');

  // WebGL描画用のコンテキストを取得する
  gl = WebGLUtils.setupWebGL(canvas);//webgl-utils.js
  if(!gl) 
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
  display();
 
  var animate = function()
  {
    //繰り返し呼び出す関数を登録
    requestAnimationFrame(animate, canvas); //webgl-utilsで定義
    //時間計測
    var currentTime = new Date().getTime();
    var frameTime = (currentTime - lastTime) / 1000.0;//時間刻み[sec]
    elapseTime += frameTime;//全経過時間
    elapseTime1 += frameTime;
    fps ++;
    if(elapseTime1 >= 0.5)
    {
      form1.fps.value = 2*fps.toString(); //1秒間隔で表示
      var timestep = 1 / (2*fps);
      form1.step.value = timestep.toString();
      fps = 0;
      elapseTime1 = 0.0;
    }
    lastTime = currentTime;　
    if(flagStart)
    {
      //オブジェクト(rigid)とオブジェクト座標の回転
      var theta = frameTime * angleStep;
      rigid.vAxis.x = parseFloat(form2.axisX.value);
      rigid.vAxis.y = parseFloat(form2.axisY.value);
      rigid.vAxis.z = parseFloat(form2.axisZ.value);
      //任意軸回転のためのクォータニオンを求める
      var q = getQFromAxis(theta, rigid.vAxis);
      if(spaceNo == 0)//慣性座標空間における回転
      {
        rigid.q = mulQQ(q, rigid.q);
        coord[3].q = mulQQ(q, coord[3].q);
        coord[4].q = mulQQ(q, coord[4].q);
        coord[5].q = mulQQ(q, coord[5].q);
        dog.q = mulQQ(q, dog.q);
      }
      else//オブジェクト座標空間における回転
      {
        rigid.q = mulQQ(rigid.q, q);
        coord[3].q = mulQQ(coord[3].q, q);
        coord[4].q = mulQQ(coord[4].q, q);
        coord[5].q = mulQQ(coord[5].q, q);
        dog.q = mulQQ(dog.q, q);
      }
      elapseTime0 = elapseTime;//現在の経過時間を保存
      form1.time.value = elapseTime.toString();
      
      if(flagStep) { flagStart = false; } 
      display();
    }      
  }
  animate();
}
//--------------------------------------------
function initCamera()
{
　//光源インスタンスを作成
  light = new Light();
  //初期設定値をHTMLのフォームに表示
  form2.lightX.value = light.pos[0];
  form2.lightY.value = light.pos[1];
  form2.lightZ.value = light.pos[2];
　//カメラ・インスタンスを作成
  camera = new Camera(); 
  camera.cnt[2] = 2.0;
  camera.getPos();//カメラ位置を計算
  mouseOperation(canvas, camera);//swgSupport.js
}

function initObject()
{  
  //オブジェクトの位置，マテリアルを決定する
  rigid = new Rigid();
  //座標軸オブジェクト
  rigid.vPos = new Vector3(0.0, 0.0, 2.0);
  rigid.vEuler = new Vector3(0, 0, 0);
  rigid.vEuler0.copy(rigid.vEuler);//回転前
  rigid.vAxis = new Vector3(1.0, 0.0, 0.0);
  rigid.vSize = new Vector3(1.0, 1.0, 1.0);
  rigid.q = getQFromEulerXYZ(rigid.vEuler);
  //HTMLのフォームをリセット

  form2.axisX.value = rigid.vAxis.x;
  form2.axisY.value = rigid.vAxis.y;
  form2.axisZ.value = rigid.vAxis.z;
  form2.debug.checked = "";

  rigid.diffuse = [0.0, 0.6, 0.6, 1.0];
  rigid.ambient = [0.0, 0.4, 0.4, 1.0];
  rigid.specular = [0.99, 0.99, 0.99, 1.0];
  rigid.shininess = 100.0;
  rigid.nSlice = 18;//x方向分割数
  rigid.nStack = 18;//y方向分割数
  rigid.eps1 = 2.0;//for "SUPER"
  rigid.eps2 = 2.0;

  //robotの初期設定
  dog = new Dog();//イヌ型ロボットのインスタンス
  dog.vPos = new Vector3(0.0, 0.0, 1.0);
  dog.vSize = new Vector3(1.0, 1.0, 1.0);
  dog.vEuler.copy(rigid.vEuler);
  dog.vAxis.copy(rigid.vAxis);
  dog.q = getQFromEulerXYZ(dog.vEuler);
  for(var i = 0; i < dog.numJoints; i++) dog.vJoints[i] = new Vector3();

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
  for(var i = 0; i < 9; i++) {
    coord[i].vEuler.copy(rigid.vEuler);
    coord[i].q = getQFromEulerXYZ(coord[i].vEuler);
    coord[i].vAxis.copy(rigid.vAxis);
  }
  

  //フロア
  floor0 = new Rigid();
  floor0.kind = "CHECK_PLATE";
  floor0.vPos = new Vector3(0.0, 0.0, -plane[3]-0.01);
  floor0.vSize = new Vector3(20, 20, 20);
  floor0.nSlice = 10;//x方向分割数
  floor0.nStack = 10;//20;//y方向分割数
  floor0.specular = [0.5, 0.5, 0.5, 1.0];
  floor0.shininess = 50;
  floor0.flagCheck = true;
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
  
  //ビュープ投影行列を計算する
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

  if(objectNo <= 6)
  {
    if(objectNo == 0)      rigid.kind = "CUBE";
    else if(objectNo == 1) rigid.kind = "SPHERE";
    else if(objectNo == 2) rigid.kind = "CYLINDER";
    else if(objectNo == 3) rigid.kind = "PRISM";
    else if(objectNo == 4) rigid.kind = "TORUS";
    else if(objectNo == 5) rigid.kind = "SUPER";
    else if(objectNo == 6) rigid.kind = "SPRING";

    if(objectNo == 3) rigid.nSlice = 6;//六角柱、六角錐
    else rigid.nSlice = 10;//20;
    
    var n = rigid.initVertexBuffers(gl);
    rigid.draw(gl, n);
  }
  else if(objectNo == 7) 
  {
    dog.flagDebug = rigid.flagDebug;
    dog.vPos.copy(rigid.vPos);
    dog.vSize.copy(rigid.vSize);
    dog.draw(gl);
  }

  //オブジェクト座標と慣性座標の位置
  for(i = 3; i < 9; i++) coord[i].vPos = rigid.vPos;

  if(flagWorld) 
  {
    for(var i = 0; i < 3; i++)
    {
      n = coord[i].initVertexBuffers(gl);
      coord[i].draw(gl, n);
    }
  }
  if(flagObject)
  {
    for(var i = 3; i < 6; i++)
    {
      n = coord[i].initVertexBuffers(gl);
      coord[i].draw(gl, n);
    }
  }
  if(flagInertial)
  {
    for(var i = 6; i < 9; i++)
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
    if(objectNo <= 6){
      n = rigid.initVertexBuffers(gl);
      rigid.draw(gl, n);
      rigid.shadow = 0;//影描画後は元に戻す
    }
    else{
      dog.shadow = shadow_value;
      dog.draw(gl);
      dog.shadow = 0;
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

function onClickObjNo()
{
  objectNo = form2.objectNo.value;
  display();
  display();
}
function onClickDebug()
{
  if(form2.debug.checked) rigid.flagDebug = true;
  else                    rigid.flagDebug = false;
  display(); 
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
  if(form2.c_object.checked) flagObject = true;
  else                     flagObject = false;
  if(form2.inertial.checked) flagInertial = true;
  else                    flagInertial = false;
  display();
}

function onClickAngVelocity()
{
  angleStep = parseFloat(form2.AngVelocity.value);
  
}
function onClickStart()
{
  fps = 0;
  elapseTime = elapseTime0;
  elapseTime0 = 0;
  elapseTime1 = 0;
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
