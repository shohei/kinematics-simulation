/*-------------------------------------------
     SpringPendulun2D.js
     バネ振り子、2自由度振動
     ラグランジュ解法と簡易解法の比較
--------------------------------------------*/
var canvas; //キャンバス要素
var ctx;//コンテキスト
var actTime, amp;
var X0, Y01, Y02;//表示座標原点（ピクセル単位、canvas座標）
var widthX, widthY;//データ表示幅（ピクセル単位）

function main() 
{
  //canvas要素を取得する
  canvas = document.getElementById('myCanvas');
  
  //描画コンテキストを取得
  ctx = canvas.getContext("2d");

  drawCoordinates();
}

function drawCoordinates()
{
　actTime = parseFloat(form1.actTime.value);//表示時間[s]
  amp = parseFloat(form1.amp.value);//縦軸振幅[m]
  //キャンバスを白でクリア
  clearCanvas("white");
  //表示座標原点
  var w0X = 50, w0Y = 20;
  X0 = w0X;
  Y01 = canvas.height / 4;
  widthX = canvas.width - 2*w0X;//横軸表示幅(ピクセル単位）
  widthY = canvas.height/4 - w0Y;//片側(ピクセル単位）

  //上段座標軸の表示
  //x軸
  drawLine(X0, Y01, X0 + widthX, Y01, "rgb(50, 50, 255)", 1);
  //y軸
  drawLine(X0, Y01+widthY, X0, Y01-widthY, "rgb(50, 50, 255)", 1);
  //drawLine(X0, w0Y, X0, canvas.height/2-w0Y, "rgb(50, 50, 255)", 1);
  //x軸目盛
  drawLine(X0 + widthX/2, Y01, X0 + widthX/2 ,  Y01 - 20,  "rgb(100, 100, 100)", 1);
  drawLine(X0 + widthX, Y01, X0 + widthX, Y01 - 40,  "rgb(100, 100, 255)", 1);
  drawText(actTime+"[s]", X0 + widthX-5, Y01 + 20, "black", 2, 2);
  //y軸目盛
  drawLine(X0, Y01 - widthY, X0 + 20,  Y01 - widthY,  "rgb(100, 100, 255)", 1);
  drawLine(X0, Y01 + widthY, X0 + 20,  Y01 + widthY,  "rgb(100, 100, 255)", 1);
  drawText("0", X0 - 20, Y01 + 5, "black", 2, 2);
  drawText(amp, X0 - 30, Y01 - widthY + 5, "black", 2, 2);
  drawText("-"+amp, X0 - 35, Y01 + widthY + 5, "black", 2, 2);
  //凡例
  drawLine(120, Y01 - widthY, 140,  Y01 - widthY,  "black", 1);
  drawText("z[m]", 145, Y01 - widthY+5, "black", 2, 2);
  drawLine(230, Y01 - widthY, 250,  Y01 - widthY,  "red", 1);
  drawText("x[m]", 255, Y01 - widthY+5, "black", 2, 2);
  drawText("Lagrange", 400, Y01 - widthY, "black", 2, 2);
  
  //下段座標軸の表示
  Y02 = 3* canvas.height / 4;
  //x軸
  drawLine(X0, Y02, X0 + widthX, Y02, "rgb(50, 50, 255)", 1);
  //y軸
  drawLine(X0, Y02+widthY, X0, Y02-widthY, "rgb(50, 50, 255)", 1);
  //x軸目盛
  drawLine(X0 + widthX/2, Y02, X0 + widthX/2 ,  Y02 - 20,  "rgb(100, 100, 100)", 1);
  drawLine(X0 + widthX, Y02, X0 + widthX, Y02 - 40,  "rgb(100, 100, 255)", 1);
  drawText(actTime+"[s]", X0 + widthX-5, Y02 + 20, "black", 2, 2);
  //y軸目盛
  drawLine(X0, Y02 - widthY, X0 + 20,  Y02 - widthY,  "rgb(100, 100, 255)", 1);
  drawLine(X0, Y02 + widthY, X0 + 20,  Y02 + widthY,  "rgb(100, 100, 255)", 1);
  drawText("0", X0 - 20, Y02 + 5, "black", 2, 2);
  drawText(amp, X0 - 30, Y02 - widthY + 5, "black", 2, 2);
  drawText("-"+amp, X0 - 35, Y02 + widthY + 5, "black", 2, 2);
  //凡例
  drawText("Easy", 400, Y02 - widthY, "black", 2, 2);
}

function onClickStart()
{
　var dt = parseFloat(form1.dt.value);//計算時のタイムステップ[s]
  var time0 = parseFloat(form1.time0.value);//最初の計算時刻[s]
　var mass = parseFloat(form1.mass.value);//質量[kg]
　var length0 = parseFloat(form1.length0.value);//自然長[m]
　var disp0 = parseFloat(form1.disp0.value);//初期変位量[m]
　var thetaDeg0 = parseFloat(form1.theta0.value);//初期振れ角[deg]
  var constK = parseFloat(form1.constK.value);//バネ定数0[N/m]
  
  var numData = parseFloat(form1.numData.value);//データ個数
　var factorX = widthX / numData;//横軸表示倍率(1データ個数当たりピクセル数）
　var factorY = widthY / amp ;//縦軸表示倍率(変位1[m]当たりのピクセル数

  //データ取り込み間隔
  var interval = Math.round((actTime / dt) / numData);
  var dataRZ = [], dataRX = [];
  var dataEZ = [], dataEX = [];
  
  var time = 0.0;//経過時間
  var count = 0;//データ個数のカウント
  var cnt = 0;//インターバルのカウント

  //Lagrangeで使用する変数
  var alpha, theta;
  var acc, vel, len, disp;

  var g = 9.8;

  //初期値(Lagrange)
  var theta = thetaDeg0 * Math.PI / 180.0;
  var omega = 0.0;
  var len = length0 + disp0;
  var vel = 0.0;

  var ss, cc;

  //Ragrange
  while (time < time0 + actTime)
  {
    //Euler
    ss = Math.sin(theta);
    cc = Math.cos(theta);
    disp = len - length0;
    if (time >= time0 && cnt == 0)
    {//interval回に1回保存
      dataRZ.push([X0 + count * factorX, Y01 - (length0 - len * cc) * factorY]) ;//鉛直軸自然長の位置を基準
      dataRX.push([X0 + count * factorX, Y01 - (len * ss) * factorY]) ;
      count++;
    }

    acc = len * omega * omega + g * cc - constK * disp / mass ;
    alpha = -(2.0 * vel * omega + g * ss) / len ;
   
    vel += acc * dt;
    omega += alpha * dt;

    len += vel * dt;
    theta += omega * dt;
    cnt++;
    if (cnt == interval) cnt = 0;
    time += dt;

  }

  //簡易解法
  time = 0;//time0;//経過時間
  count = 0;//データ個数のカウント
  cnt = 0;//インターバルのカウント

  //初期値(簡易解法）
  theta = thetaDeg0 * Math.PI / 180.0;
  len = length0 + disp0;
  var posX = len * Math.sin(theta);
  var posZ = length0 - len * Math.cos(theta);
  var velX = 0.0; var velZ = 0.0;
  var accX, accZ;
  
  while (time < time0 + actTime)
  {
    if (time >= time0 && cnt == 0)
    {//interval回に1回保存
      dataEZ.push([X0 + count * factorX, Y02 - posZ * factorY]) ;//鉛直軸自然長の位置を基準
      dataEX.push([X0 + count * factorX, Y02 - posX * factorY]) ;
      count++;
    }
    //Euler
    ss = Math.sin(theta);
    cc = Math.cos(theta);
    disp = len - length0;

    accX = -constK * disp * ss / mass ;
    accZ = constK * disp * cc / mass - g ;

    velX += accX * dt;
    velZ += accZ * dt;

    posX += velX * dt;
    posZ += velZ * dt;
    
    len = Math.sqrt(posX * posX + (length0 - posZ) * (length0 - posZ));
    theta = Math.atan2(posX, length0 - posZ);

    cnt++;
    if (cnt == interval) cnt = 0;
    time += dt;

  }
  drawLines(dataRZ, "black", 1);
  drawLines(dataRX, "red", 1);
  drawLines(dataEZ, "black", 1);
  drawLines(dataEX, "red", 1);
}

//-------------------------------------------------------------
function onClickClear()
{
  drawCoordinates();
}

function onChangeData()
{
  drawCoordinates();
}

