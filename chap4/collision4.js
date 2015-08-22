/*-------------------------------------------
     collision4.js
     多数剛体の衝突
-------------------------------------------*/
var canvas; //canvas要素
var gl;     //WebGL描画用コンテキスト
var camera; //カメラ
var light;  //光源
var numRigid = 300;//3の倍数
var rigid = []; 
var dummy;
var floor0;
var coord = [];//座標軸表示用
var plane = [0.0, 0.0, 1.0, 0.0];//床平面(z = 0)
var shadow_value = 0.2;
var flagShadow = true;

var flagWorld = false;
var dt;
var kind0No = 0;
var kind1No = 0;
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
  gl.clearColor(0.1, 0.1, 0.1, 1.0);
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
      var vPos = new Vector3();

      for(var i = 0; i < numRigid; i++)
      {
        rigid[i].state = "FREE";

        vPos.copy(rigid[i].vPos); vPos.z = 0;
        var rad = mag(vPos);//ワールド座標中心からの距離
        //外へ向かう方向
        var vDirOut = normXY(vPos);
        //中心に向かう方向 
        var vDirIn = reverse(vDirOut);

        if(rigid[i].vPos.z < 8)
        {
          if(rad > 5) rigid[i].vForce0 = mul(getRandom(50, 100), vDirIn);
          if(rad < 4) rigid[i].vForce0 = mul(getRandom(40, 60), vDirOut);
          if(rad < 6) rigid[i].vForce0.z = getRandom(200, 500);
        }
        else
        {
          rigid[i].vForce0 = mul(getRandom(70,100), vDirOut);
          if(rad > 5) rigid[i].vForce0.z = -getRandom(150, 300);
        }
        var speed = mag(rigid[i].vVel);
        if(speed > 30) 
        {
          var vDir = norm(rigid[i].vVel);
          rigid[i].vVel = mul(30, vDir);
        }
      }
      collision(dt);

      elapseTime0 = elapseTime;//現在の経過時間を保存
      form1.time.value = elapseTime.toString();
      
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
  tex[2] = gl.createTexture();
  
  //Imageオブジェクトを作成する
  var image = [];
  for(var i = 0; i < 3; i++) image[i] = new Image();
  image[0].src = '../imageJPEG/check3.jpg';
  image[1].src = '../imageJPEG/check2.jpg';
  image[2].src = '../imageJPEG/check4.jpg';
  var flagLoaded = [];//画像読み込み終了フラグ
  flagLoaded[0] = false;
  flagLoaded[1] = false;
  flagLoaded[2] = false;
  
  // 画像の読み込み完了時のイベントハンドラを設定する
  image[0].onload = function(){ setTexture(0); }
  image[1].onload = function(){ setTexture(1); }
  image[2].onload = function(){ setTexture(2); }

  function setTexture(no)
  {
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);// 画像のY軸を反転する
    // テクスチャユニット0を有効にする
    if(no == 0) gl.activeTexture(gl.TEXTURE0);
    else if(no == 1) gl.activeTexture(gl.TEXTURE1);
    else gl.activeTexture(gl.TEXTURE2);
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
    if(flagLoaded[0] && flagLoaded[1] && flagLoaded[2]) display();
  }
}
//--------------------------------------------
function initCamera()
{
  //カメラと光源の初期設定
　//光源インスタンスを作成
  light = new Light();
  light.pos = [50, 50, 100, 1];
  //初期設定値をHTMLのフォームに表示
  form2.lightX.value = light.pos[0];
  form2.lightY.value = light.pos[1];
  form2.lightZ.value = light.pos[2];
　//カメラ・インスタンスを作成
  camera = new Camera();
  camera.dist = 40; 
  camera.cnt[2] = 5.0;
  camera.getPos();//カメラ位置を計算
  
  mouseOperation(canvas, camera);//swgSupport.js
}  
  
function initObject()
{
  flagStart = false;

  dt = parseFloat(form1.dt.value);//計算時のタイムステップ[s]
  restitution = parseFloat(form2.restitution.value);
  muK =  parseFloat(form2.muK.value);
  
  numRigid = parseFloat(form2.num.value);

  for(var i = 0; i < numRigid; i++) rigid[i] = new Rigid();
  
  //オブジェクト0
  rigid[0].kind = "CUBE";
  rigid[0].vVel = new Vector3(0, 0, 0);
  rigid[0].vSize = new Vector3(1.5, 1.5, 1.5);
  rigid[0].flagTexture = true;
  rigid[0].flagDebug = flagDebug;
  rigid[0].mass = 1.0;//kg
  rigid[0].ready();
  //オブジェクト1
  var n1 = numRigid / 3;
  rigid[n1].kind = "SPHERE";
  rigid[n1].vSize = new Vector3(1.5, 1.5, 1.5);
  rigid[n1].nSlice = 8;//12;
  rigid[n1].nStack = 8;//12;
  rigid[n1].flagTexture = true;
  rigid[n1].flagDebug = flagDebug;
  rigid[n1].mass = 1.0;//kg
  rigid[n1].ready();
  
  //オブジェクト2 
  var n2 = 2 * numRigid / 3;
  rigid[n2].kind = "CYLINDER";
  rigid[n2].flagTexture = true;
  rigid[n2].flagDebug = flagDebug;
  rigid[n2].vSize = new Vector3(1.5, 1.5, 1.5);
  rigid[n2].nSlice = 8;//12;
  rigid[n2].radiusRatio = 1.0;
  rigid[n2].flagTexture = true;
  rigid[n2].mass = 1.0;//kg
  rigid[n2].ready();
  
  for(var i = 1; i < n1; i++) 
  {
    rigid[i].kind = "CUBE";
    rigid[i].diffuse = [0.9, 0.6, 0.0, 1.0];
    rigid[i].ambient = [0.5, 0.3, 0.0, 1.0];
    rigid[i].ready();
  }
  for(var i = n1+1; i < n2; i++) 
  {
    rigid[i].kind = "SPHERE";
    rigid[i].diffuse = [0.0, 0.6, 0.9, 1.0];
    rigid[i].ambient = [0.0, 0.3, 0.5, 1.0];
    rigid[i].nSlice = 8;//12;
    rigid[i].nStack = 8;//12;
    rigid[i].ready();
  }
  for(var i = n2+1; i < numRigid; i++) 
  {
    rigid[i].kind = "CYLINDER";
    rigid[i].diffuse = [0.4, 0.6, 0.4, 1.0];
    rigid[i].ambient = [0.2, 0.3, 0.2, 1.0];
    rigid[i].radiusRatio = 1.0;
    rigid[i].nSlice = 8;//12;
    //rigid[i].nStack = 8;//12;
    rigid[i].ready();
  }  
  
  for(var i = 0; i < numRigid; i++) 
  {
    rigid[i].vPos = getRandomVector(8);
    if(rigid[i].vPos.z <= 0.5) rigid[i].vPos.z = 0.5;
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
  coord[0].diffuse = [0.5, 0.0, 0.0, 1.0];
  coord[0].ambient = [0.5, 0.0, 0.0, 1.0];
  coord[1].diffuse = [0.0, 0.5, 0.0, 1.0];
  coord[1].ambient = [0.0, 0.5, 0.0, 1.0];
  coord[2].diffuse = [0.0, 0.0, 0.5, 1.0];
  coord[2].ambient = [0.0, 0.0, 0.5, 1.0];
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

  var samplerLoc = gl.getUniformLocation(gl.program, 'u_sampler');
  var n = rigid[0].initVertexBuffers(gl);//CUBE
  for(var k = 0; k < numRigid/3; k++) 
  {
    rigid[k].draw(gl, n);
    gl.activeTexture(gl.TEXTURE0);
    gl.uniform1i(samplerLoc, 0);
  }
  n = rigid[numRigid/3].initVertexBuffers(gl);//SPHERE
  for(var k = numRigid/3; k < 2*numRigid/3; k++) 
  {
    rigid[k].draw(gl, n);
    gl.activeTexture(gl.TEXTURE1);
    gl.uniform1i(samplerLoc, 1);
  }  
  n = rigid[2*numRigid/3].initVertexBuffers(gl);//CYLINDER
  for(var k = 2*numRigid/3; k < numRigid; k++)
  {
    rigid[k].draw(gl, n);
    gl.activeTexture(gl.TEXTURE2);
    gl.uniform1i(samplerLoc, 2);
  } 
  
  if(flagWorld) 
  {
    for(var i = 0; i < 3; i++)
    {
      var n = coord[i].initVertexBuffers(gl);
      coord[i].draw(gl, n);
    }
  }

  n = floor0.initVertexBuffers(gl);
  floor0.draw(gl, n);

  //影 
  if(flagShadow) drawShadow();    

  function drawShadow()
  {
    gl.depthMask(false);
    gl.blendFunc(gl.SRC_ALPHA_SATURATE,gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.BLEND);
    
    for(var k = 0; k < numRigid; k++) rigid[k].shadow = shadow_value;    
    var n = rigid[0].initVertexBuffers(gl);//CUBE
    for(var k = 0; k < numRigid/3; k++) rigid[k].draw(gl, n);
    n = rigid[numRigid/3].initVertexBuffers(gl);//SPHERE
    for(var k = numRigid/3; k < 2*numRigid/3; k++) rigid[k].draw(gl, n);  
    n = rigid[2*numRigid/3].initVertexBuffers(gl);//CYLINDER
    for(var k = 2*numRigid/3; k < numRigid; k++) rigid[k].draw(gl, n);
    
    for(var k = 0; k < numRigid; k++) rigid[k].shadow = 0;    
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

function onClickCollision()
{
  flagCollision = form2.collision.checked;
}
function onClickSeparate()
{
  flagSeparate = form2.separate.checked;
}

function onClickDrag()
{
  flagDrag = form2.drag.checked;
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
function onClickDebug()
{
  if(form2.debug.checked) flagDebug = true;
  else                    flagDebug = false;
  for(var i = 0; i < numRigid; i++) rigid[i].flagDebug = flagDebug;
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

  if(rigid[1].kind == "SPHERE")
  { if(rigid[1].vSize.x != rigid[1].vSize.y || rigid[1].vSize.y != rigid[1].vSize.z || rigid[1].vSize.x != rigid[1].vSize.z)
    alert("球のサイズはすべて同じ値にすること!");
  }
  else if(rigid[1].kind == "CYLINDER")
  { if(rigid[1].vSize.x != rigid[1].vSize.y)
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
  shadow_value = parseFloat(form2.shadow.value);
  //display();
}

function onClickFlagShadow()
{
  flagShadow = form2.flagShadow.checked;
}

function onClickPeriod()
{
  periodTrace = parseFloat(form2.period.value);
}



//-----------------------------------------------------------------------------
