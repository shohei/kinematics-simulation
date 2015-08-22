/*------------------------------------------------------
    treeSM2D2.js
    フラクタルによる2D樹木シミュレーション
-------------------------------------------------------*/
var canvas; //canvas要素
var ctx;//コンテキスト
var sm = new SpringMassTree2D();
var X0, Y0;//表示するときの最初の頂点の位置
var dt;//タイムステップ[s]
var timer;
//animation
var fps = 0;
var lastTime = new Date().getTime();
var elapseTime = 0.0;//全経過時間
var elapseTime0 = 0.0;
var elapseTime1 = 0.0;
var flagStart = false;
var flagStep = false;
var flagReset = false;
//外力
var windVel = 1;
var windFreq = 0.5;
var windGrad = 0.5;

function Main() 
{
  //canvas要素を取得する
  canvas = document.getElementById('myCanvas');
  
  //描画コンテキストを取得
  ctx = canvas.getContext("2d");
  //キャンバスを白でクリア
  clearCanvas("white");

  //最初の頂点（イニシエータの下点, 表示のときに必要）
  X0 = canvas.width / 2.0;
  Y0 = canvas.height - 50;

  getData();
  sm.create();
  sm.draw();
  
  var animate = function()
  {
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
      for(var k = 0; k < sm.numPoint; k++)
      {
        var f = 0.1 * windVel * (1 - windGrad * sm.point[k].vPos.x);
        if(f < 0) f = 0;
        var wind = 0.3 * Math.sin(2.0 * Math.PI * windFreq * t);
		sm.point[k].vForce0.x = f * (1 + wind);
      }

	  var tt = dt / 10;//間引き表示
      for(var j = 0; j < 10; j++) sm.calcSM(tt);
      
      elapseTime0 = elapseTime;//現在の経過時間を保存
      form1.time.value = elapseTime.toString();//経過時間を表示
      
      if(flagStep) { flagStart = false; } 

      clearCanvas("white");
      sm.draw();
    }
  }
  timer = setInterval(animate, dt * 1000);
}

function getData()
{
  dt = parseFloat(form1.dt.value);//計算時のタイムステップ[s]

  windVel = parseFloat(form2.winVel.value);//風速
  windFreq = parseFloat(form2.winFreq.value);//振動数
  windGrad = parseFloat(form2.winGrad.value);//勾配

  sm.mass = parseFloat(form2.mass.value);
  sm.numGeneration = parseFloat(form2.generation.value);
  sm.numBranch = parseFloat(form2.branch.value);
  sm.rate = parseFloat(form2.rate.value);
  sm.variation = parseFloat(form2.variation.value);
  sm.alpha = parseFloat(form2.alpha.value) * DEG_TO_RAD;//rad;
  sm.constK0 = parseFloat(form2.constK.value);
  sm.drctnK0 = parseFloat(form2.drctnK.value);
  sm.damping = parseFloat(form2.damping.value);
  sm.drag = parseFloat(form2.drag.value);
  sm.width0 = parseFloat(form2.width.value);
  
  sm.scale = parseFloat(form2.scale.value);
  
  onClickReset();
}

//-------------------------------------------------------------
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
  form1.time.value = "0";

  clearCanvas("white");
  sm.create();
  sm.draw();
}

function onChangeData()
{
  getData();
}

function onChangeScale()
{
  sm.scale = parseFloat(form2.scale.value);
  clearCanvas("white");
  sm.draw();
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
  windGrad = parseFloat(form2.winGrad.value);//風速
} 


