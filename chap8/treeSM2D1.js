/*------------------------------------------------------
    treeSM2D1.js
    フラクタルによる樹木曲線の生成
-------------------------------------------------------*/
function Branch()//枝クラス
{
  this.np1;//枝の両端の頂点番号
  this.np2;
  this.length;//枝の長さ
}

function Point()//点クラス
{
  this.x;
  this.y;
}

function getRandom(fMin, fMax)
{//一様乱数
  return fMin + (fMax - fMin) * Math.random();
}

//-----------------------------------------------------------
var canvas; //canvas要素
var ctx;//コンテキスト
var numBranchAll;//枝総本数（イニシエータを含む）
var branch = [];
var point = [];
var numPoint    ;//総頂点数数
var numGeneration = 6;
var numBranch = 2;   //枝の分岐数(枝1本から次の世代に派生する枝個数）
var alpha = 30;  //そのときの分岐角(片側)
var numPoint;    //頂点(端点)総数
var length0 = 1; //イニシエータ（親枝）の長さ
var rate = 0.8;  //成長率
var variation = 0;//変動率
var scale = 50;   //表示倍率

function Main() 
{
  //canvas要素を取得する
  canvas = document.getElementById('myCanvas');
  
  //描画コンテキストを取得
  ctx = canvas.getContext("2d");

  //最初の頂点（イニシエータの下点, 表示のときに必要）
  X0 = canvas.width / 2.0;
  Y0 = canvas.height - 50;

  clear();
  getData();
  create();
  drawBranch();
}

function getData()
{
  numGeneration = parseFloat(form2.generation.value);
  numBranch = parseFloat(form2.branch.value);
  rate = parseFloat(form2.rate.value);
  variation = parseFloat(form2.variation.value);
  alpha = parseFloat(form2.alpha.value) * Math.PI / 180.0;//rad;
  scale = parseFloat(form2.scale.value);
  //キャンバスをクリア
  clearCanvas("rgb(248, 248, 248)");
  create();
  drawBranch();

}

function create()
{
  var i, j, k, theta;
  
  numBranchAll = 0;//総枝個数
  for(i = 0; i < numGeneration; i++){ numBranchAll += Math.pow(numBranch, i); }
  numPoint = numBranchAll + 1;//総端点個数
  
  for(i = 0; i < numPoint; i++) point[i] = new Point();
  for(i = 0; i < numBranchAll; i++) branch[i] = new Branch();
  
  var nb = 0, np1 = 0, np2 = 0;
  
  var numBranchGen = 0;//各世代の枝総数
  var beta  = [];//枝の偏角（水平面からの角度）
  var beta0 = [];//枝の偏角（水平面からの角度）
         
  var delta = 2*alpha / (numBranch-1);//枝間角度

  //initiator(0代目）
  point[0].x = 0; point[0].y = 0;
  point[1].x = 0; point[1].y = length0;
  branch[0].np1 = 0; branch[0].np2 = 1; branch[0].length = length0;
  nb = 1; np1 = 1; np2 = 2;//次世代の枝番号とその両端の頂点番号
  
  beta[0] = Math.PI / 2.0;//x軸からの偏角
  
  var len = length0;//枝の長さ
  var va = variation;
  numBranchGen = 1;

  for(i = 1; i < numGeneration; i++)
  {
    len *= rate;
    k = 0;
    for (j = 0; j < numBranchGen; j++)//このnumBranchGenは前世代の枝個数
    {
      beta0[j] = beta[j] * (1.0 + getRandom(-va, va));;
    }
    for(j = 0; j < numBranchGen; j++)
    {
      for(m = 0; m < numBranch; m++)
      {
        theta = m * delta - this.alpha;
        
        beta[k] = beta0[j] + theta * (1.0 + getRandom(-va, va));
        branch[nb].np1 = np1; branch[nb].np2 = np2;
        point[np2].x = point[np1].x + len * Math.cos(beta[k]) * (1.0 + getRandom(-va, va)); 
        point[np2].y = point[np1].y + len * Math.sin(beta[k]) * (1.0 + getRandom(-va, va));
        np2++;
        k++;
        nb++;
      }
      np1++;
    }
    numBranchGen *= numBranch;//現世代の枝個数
  }
}

function drawBranch()
{
  var k, np1, np2;
  for (k = 0; k < numBranchAll; k++){
    np1 = branch[k].np1; np2 = branch[k].np2;
    drawLine(X0 + scale * point[np1].x, Y0 - scale * point[np1].y, X0 +  scale * point[np2].x, Y0 - scale * point[np2].y , "black", 1);
  }
}

//-------------------------------------------------------------
function onClickReset()
{
  //キャンバスをクリア
  clear();
  create();
  drawBranch();
}

function onChangeData()
{
  getData();
}

function onChangeScale()
{
  scale = parseFloat(form2.scale.value);
  clear();
  drawBranch();
}
 
function clear()
{
  //キャンバスをクリア
  clearCanvas("rgb(248, 248, 248)");
}
