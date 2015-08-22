/*---------------------------------------------
     collision1.js
     2剛体の衝突
----------------------------------------------*/
var canvas; //canvas要素
var gl;     //WebGL描画用コンテキスト
var camera; //カメラ
var light;  //光源
var numRigid = 2;
var rigid = []; 
var dummy;
var floor0;
var coord = [];//座標軸表示用
var plane = [0.0, 0.0, 1.0, 0.0];//床平面(z = 0)
var shadow_value = 0.2;

var flagWorld = false;
var dt;
var kind0No = 1;
var kind1No = 1;
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
var tracePos1 = [];

var maxTrace = 100; //軌跡点個数の最大値
var countTrace = 0;     //軌跡点個数のカウント
var periodTrace = 0.1;//軌跡点を表示する時間間隔
var timeTrace = 0;  //その経過時間
var vPointPos0 = new Vector3();;

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
  gl.clearColor(0.4, 0.4, 0.6, 1.0);
  gl.enable(gl.DEPTH_TEST);
  initCamera();
  initObject();
  readyTexture();
  
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
      collision(dt);
      elapseTime0 = elapseTime;//現在の経過時間を保存
      form1.time.value = elapseTime.toString();
      
      if(flagStep) { flagStart = false; } 
      
      //軌跡位置データ作成
      if(timeTrace == 0) 
      {
        tracePos0[countTrace].copy(rigid[0].vPos);        
        tracePos1[countTrace].copy(rigid[1].vPos);
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
//------------------------------------------------------------------------
function readyTexture() 
{
  //テクスチャオブジェクトを作成する
  var tex = [];
  tex[0] = gl.createTexture();   
  tex[1] = gl.createTexture(); 
  
  //Imageオブジェクトを作成する
  var image = [];
  for(var i = 0; i < numRigid; i++) image[i] = new Image();
  image[0].src = '../imageJPEG/check3.jpg';
  image[1].src = '../imageJPEG/check2.jpg';
  var flagLoaded = [];//画像読み込み終了フラグ
  flagLoaded[0] = false;
  flagLoaded[1] = false;
  
  // 画像の読み込み完了時のイベントハンドラを設定する
  image[0].onload = function(){ setTexture(0); }
  image[1].onload = function(){ setTexture(1); }

  function setTexture(no)//, texA, imageA) 
  {
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);// 画像のY軸を反転する
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
  light.pos = [5, 5, 20, 1];
  //初期設定値をHTMLのフォームに表示
  form2.lightX.value = light.pos[0];
  form2.lightY.value = light.pos[1];
  form2.lightZ.value = light.pos[2];
　//カメラ・インスタンスを作成
  camera = new Camera();
  camera.dist = 20; 
  camera.cnt[2] = 5.0;
  camera.getPos();//カメラ位置を計算
  
  mouseOperation(canvas, camera);//swgSupport.js
}  
  
function initObject()
{
  flagStart = false;
  periodTrace = parseFloat(form1.periodTrace.value);

  dt = parseFloat(form1.dt.value);//計算時のタイムステップ[s]

  restitution = parseFloat(form1.restitution.value);
  muK =  parseFloat(form1.muK.value);
  //オブジェクトの位置，マテリアルを決定する
  for(var i = 0; i < numRigid; i++) rigid[i] = new Rigid();
  
  //オブジェクト0
  if(kind0No == 0) rigid[0].kind = "CUBE";
  else if(kind0No == 1) rigid[0].kind = "SPHERE";
  else if(kind0No == 2) rigid[0].kind = "CYLINDER";
  rigid[0].vSize.x = parseFloat(form2.size0X.value);
  rigid[0].vSize.y = parseFloat(form2.size0Y.value);
  rigid[0].vSize.z = parseFloat(form2.size0Z.value);
  rigid[0].vPos.x = parseFloat(form2.pos0X.value);
  rigid[0].vPos.y = parseFloat(form2.pos0Y.value);
  rigid[0].vPos.z = parseFloat(form2.pos0Z.value);
  rigid[0].vVel.x = parseFloat(form2.vel0X.value);
  rigid[0].vVel.y = parseFloat(form2.vel0Y.value);
  rigid[0].vVel.z = parseFloat(form2.vel0Z.value);
  rigid[0].vEuler.x = parseFloat(form2.ang0X.value);
  rigid[0].vEuler.y = parseFloat(form2.ang0Y.value);
  rigid[0].vEuler.z = parseFloat(form2.ang0Z.value);
  rigid[0].q = getQFromEulerXYZ(rigid[0].vEuler);
  rigid[0].vOmega.x = parseFloat(form2.omg0X.value) * 2 * Math.PI;
  rigid[0].vOmega.y = parseFloat(form2.omg0Y.value) * 2 * Math.PI;
  rigid[0].vOmega.z = parseFloat(form2.omg0Z.value) * 2 * Math.PI;
  rigid[0].nSlice =8;// 12;
  rigid[0].nStack =8;// 12;
  rigid[0].radiusRatio = 1.0;
  rigid[0].flagTexture = true;
  rigid[0].flagDebug = flagDebug;
  rigid[0].mass = parseFloat(form1.mass0.value);//kg
  rigid[0].ready();
  //オブジェクト1
  if(kind1No == 0) rigid[1].kind = "CUBE";
  else if(kind1No == 1) rigid[1].kind = "SPHERE";
  else if(kind1No == 2) rigid[1].kind = "CYLINDER";
  rigid[1].vSize.x = parseFloat(form2.size1X.value);
  rigid[1].vSize.y = parseFloat(form2.size1Y.value);
  rigid[1].vSize.z = parseFloat(form2.size1Z.value);
  rigid[1].vPos.x = parseFloat(form2.pos1X.value);
  rigid[1].vPos.y = parseFloat(form2.pos1Y.value);
  rigid[1].vPos.z = parseFloat(form2.pos1Z.value);
  rigid[1].vVel.x = parseFloat(form2.vel1X.value);
  rigid[1].vVel.y = parseFloat(form2.vel1Y.value);
  rigid[1].vVel.z = parseFloat(form2.vel1Z.value);
  rigid[1].vEuler = new Vector3(0, 0, 0);
  rigid[1].q = getQFromEulerXYZ(rigid[1].vEuler);
  rigid[1].nSlice = 12;
  rigid[1].nStack = 12;
  rigid[1].radiusRatio = 1.0;
  rigid[1].flagTexture = true;
  rigid[1].flagDebug = flagDebug;
  rigid[1].mass = parseFloat(form1.mass1.value);//kg
  rigid[1].ready();

  //軌跡用点表示のためのダミー
  dummy = new Rigid();
  dummy.nSlice = 30;//非表示
  dummy.nStack = 30;
  //軌跡用オブジェクトの位置座標配列
　for(var i = 0; i < maxTrace; i++) {
    tracePos0[i] = new Vector3(1000,0,0);//初期値は遠方
    tracePos1[i] = new Vector3(1000,0,0);//初期値は遠方
  }
  
  //座標軸
  var lenCoord = 2.0;
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
  for(var i = 0; i < 3; i++) coord[i].q = getQFromEulerXYZ(coord[i].vEuler);

  //フロア
  floor0 = new Rigid();
  floor0.kind = "CHECK_PLATE";
  floor0.vPos = new Vector3(0.0, 0.0, -plane[3]-0.01);
  floor0.vSize = new Vector3(40, 40, 1);
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

  var flagPointLoc = gl.getUniformLocation(gl.program, 'u_flagPoint');

  gl.uniform1i(flagPointLoc, false);
  var samplerLoc = gl.getUniformLocation(gl.program, 'u_sampler');
  var n;
  for(var k = 0; k < numRigid; k++)
  {
    if(k == 0) gl.activeTexture(gl.TEXTURE0);
    else gl.activeTexture(gl.TEXTURE1);
    gl.uniform1i(samplerLoc, k);
    //オブジェクトの描画
    n = rigid[k].initVertexBuffers(gl);
    rigid[k].draw(gl, n);
  }

  if(flagTrace)
  {
    var n = dummy.initVertexBuffers(gl);
    //軌跡用オブジェクト
    gl.uniform1i(flagPointLoc, true);
    n = initVertexPoints();
    gl.drawArrays(gl.POINTS, 0, n);
    gl.uniform1i(flagPointLoc, false);
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

function onChangeKind0()
{
  var radioK0 =  document.getElementsByName("radioK0");
  for(var i = 0; i < radioK0.length; i++)
  {
     if(radioK0[i].checked) kind0No = i;
  }
  initObject();
}
function onChangeKind1()
{
  var radioK1 =  document.getElementsByName("radioK1");
  for(var i = 0; i < radioK1.length; i++)
  {
     if(radioK1[i].checked) kind1No = i;
  }
  initObject();
}

function onClickDrag()
{
  if(form1.drag.checked) flagDrag = true;
  else flagDrag = false;
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
  if(form1.world.checked) flagWorld = true;
  else                    flagWorld = false;
  display();
}
function onClickDebug()
{
  if(form1.debug.checked) flagDebug = true;
  else                    flagDebug = false;
  
  rigid[0].flagDebug = flagDebug;
  rigid[1].flagDebug = flagDebug;
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

function onClickTrace()
{
  flagTrace = form1.trace.checked;
  display(); 
}

function onClickPeriod()
{
  periodTrace = parseFloat(form1.period.value);
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
    vertices.push(0);//オブジェクト番号
    vertices.push(tracePos1[i].x);
    vertices.push(tracePos1[i].y);
    vertices.push(tracePos1[i].z);
    vertices.push(1);
  }

  // バッファオブジェクトを作成する
  var vertexBuffer = gl.createBuffer();
  // バッファオブジェクトをバインドにする
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  // バッファオブジェクトにデータを書き込む
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

  vertexLoc = gl.getAttribLocation(gl.program, 'a_vertex');
  // a_vertex変数にバッファオブジェクトを割り当てる
  gl.vertexAttribPointer(vertexLoc, 4, gl.FLOAT, false, 0, 0);

  // a_verte変数でのバッファオブジェクトの割り当てを有効化する
  gl.enableVertexAttribArray(vertexLoc);
  // バッファオブジェクトのバインドを解除する
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  
  //軌跡用点データは2組
  return 2*len;
}

