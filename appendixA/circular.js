/*----------------------------------------------
     circular.js
     等速円運動
-----------------------------------------------*/
var canvas; //キャンバス要素
var ctx;//コンテキスト
var X0, Y0;//中心のcanvas座標

function main() 
{
  //canvas要素を取得する
  canvas = document.getElementById('myCanvas');
  
  //描画コンテキストを取得
  ctx = canvas.getContext("2d");
  
  clearCanvas("white");

  drawCoordinates();
}

function drawCoordinates()
{
  //表示座標原点
  X0 = canvas.width / 2;
  Y0 = canvas.height / 2;
  
  //座標軸の表示
  //x軸
  drawLine(20, canvas.height/2, canvas.width-20, canvas.height/2, "rgb(100, 100, 255)", 1);
  //y軸
  drawLine(canvas.width/2, 50, canvas.width/2, canvas.height-20, "rgb(100, 100, 255)", 1);
  
  //凡例
  drawLine(20, 20, 50, 20, "black", 1);
  drawText("解析解", 55, 25, "black", 2, 2);
  drawLine(140, 20, 170, 20, "red", 1);
  drawText("前進オイラー", 175, 25, "black", 2, 2);
  drawLine(310, 20, 340, 20, "blue", 1);
  drawText("後退オイラー", 345, 25, "black", 2, 2);
  drawLine(480, 20, 510, 20, "green", 1);
  drawText("改良オイラー", 515, 25, "black", 2, 2);
  drawLine(20, 50, 50, 50, "magenta", 1);
  drawText("かえる跳び", 55, 55, "black", 2, 2);
}  

function onClickStart()
{　
  //r = 1, v = 1, w = 1で計算
  var Radius = 150;//表示半径

  var dt = parseFloat(form1.dt.value);

  if(form1.m_analysis.checked) analysisSolution();
  if(form1.m_for.checked) forwardEuler();
  if(form1.m_back.checked) backwardEuler();
  if(form1.m_improved.checked) improvedEuler();
  if(form1.m_frog.checked) leap_frog();

  function analysisSolution()
  {  
    //解析解を完全な円で表示
    drawCircle(X0, Y0, Radius, 0, "black", 1);
  }

  function forwardEuler()
  {
    //前進オイラー法
    var data = [];
    var x, y, vx, vy, ax, ay, v2, r2;
    var time = 0.0;
    
    //初期値
    x = 1.0; y = 0.0; vx = 0.0; vy = 1.0; v2 = 1.0; ax = -1.0; ay = 0.0; r2 = 1; omega = 1;
    data.push([X0 + x * Radius, Y0 - y * Radius]);//始点のデータ    
    while(time <= 4.0 * Math.PI)//２周
    {
      r2 = x * x + y * y;
      v2 = vx * vx + vy * vy;
　    x += vx * dt; y += vy * dt;
      vx += ax * dt; vy += ay * dt;
      ax = -v2 * x / r2; ay = -v2 * y / r2;
      data.push([X0 + x * Radius, Y0 - y * Radius]);
      time += dt;
    }
    drawLines(data, "red");
  }
  
  function backwardEuler()
  {
    //後退オイラー法
    var data = [];
    var x, y, vx, vy, ax, ay, v2, r2;
    var time = 0.0;

    //初期値
    x = 1.0; y = 0.0; vx = 0.0; vy = 1.0; v2 = 1.0; ax = -1.0; ay = 0.0; r2 = 1;
    data.push([X0 + x * Radius, Y0 - y * Radius]);//始点のデータ    
    while(time <= 4.0 * Math.PI)//２周
    {
      r2 = x * x + y * y;
      v2 = vx * vx + vy * vy;
      ax = -v2 * x / r2; ay = -v2 * y / r2;
      vx += ax * dt; vy += ay * dt;
      x += vx * dt; y += vy * dt;
      data.push([X0 + x * Radius, Y0 - y * Radius]);
      time += dt;
    }
    drawLines(data, "blue");
  }

  function improvedEuler()
  {
    //改良オイラー法
    var data = [];
    var x, y, vx, vy, ax, ay, v2, r2;
    var vx1, vy1, ax1, ay1; 
    var time = 0.0;
    
    //初期値
    x = 1.0; y = 0.0; vx = 0.0; vy = 1.0; v2 = 1.0; 
    ax = -1.0; ay = 0.0; r2 = 1;
    data.push([X0 + x * Radius, Y0 - y * Radius]);//始点のデータ    
    while(time <= 4.0 * Math.PI)//２周
    {
　　　//現在のv2, r2
      v2 = vx * vx + vy * vy;
      r2 = x * x + y * y;
      //前進オイラー法で次時刻の仮の速度を求める
      vx1 = vx + ax * dt;
      vy1 = vy + ay * dt;
      //位置の更新
      x += 0.5 * (vx + vx1) * dt;
      y += 0.5 * (vy + vy1) * dt;
      //加速度の更新
      ax1 = -v2 * x / r2; ay1 = -v2 * y / r2;
      //速度の更新
      vx += 0.5 * (ax + ax1) * dt;
      vy += 0.5 * (ay + ay1) * dt;
      ax = ax1; ay = ay1;//ax1, ay1を次時刻の加速度にする

      data.push([X0 + x * Radius, Y0 - y * Radius]);
      time += dt;
    }
    drawLines(data, "green");
  }

  function leap_frog()
  {
    //かえる跳び法
    var data = [];
    var x, y, vx, vy, ax, ay, v2, r2, time;
    time = 0.0;

    //初期値
    x = 1.0; y = 0.0; vx = 0.0; vy = 1.0; v2 = 1.0; ax = -1.0; ay = 0.0; r2 = 1;
    data.push([X0 + x * Radius, Y0 - y * Radius]);//始点のデータ    
    //最初のかえる跳び
    r2 = x * x + y * y;
    v2 = vx * vx + vy * vy;
    ax = -v2 * x / r2; ay = -v2 * y / r2;
    vx += ax * dt / 2; vy += ay * dt / 2;
    x += vx * dt; y += vy * dt;
    time = dt;
    data.push([X0 + x * Radius, Y0 - y * Radius]);//dt後の位置    
    while(time <= 4.0 * Math.PI)//２周
    {
　　　//現在のv2, r2
      r2 = x * x + y * y;
      v2 = vx * vx + vy * vy;
      //加速度の更新
      ax = -v2 * x / r2; ay = -v2 * y / r2;
      //速度の更新
      vx += ax * dt; vy += ay * dt;
      //位置の更新
      x += vx * dt; y += vy * dt;
      data.push([X0 + x * Radius, Y0 - y * Radius]);
      time += dt;
    }
    drawLines(data, "magenta");
  }
}
//-------------------------------------------------------------
function onClickClear()
{ 
  clearCanvas("white");
  drawCoordinates();
}

