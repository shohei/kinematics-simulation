/*-----------------------------------------------------------------
  swgSpringMassTree2D.js
  1次元バネ質点モデルで樹木を表現
  フラクタルで2次元樹木形成
-------------------------------------------------------------------*/
function Point()//点クラス
{
  this.vPos = new Vector3();   //位置
  this.vForce = new Vector3(); //外力
  this.vForce0 = new Vector3();//外力初期値
  this.vVel = new Vector3();   //速度
}
function Spring()//バネクラス
{
  this.np1;    //枝の両端の頂点番号
  this.np2;
  this.length0;//自然長
  this.vDir0;  //初期設定時方向
  this.constK; //構造バネのバネ定数
  this.drctnK; //方向バネのバネ定数
  this.width ; //枝の太さ
}

var gravity = 9.8;//重力加速度

function SpringMassTree2D()
{
  var numPoint;//質点（頂点）総数
  var numSpring;//バネ（枝）総数

  this.vPos = new Vector3();//根の位置
  this.vForce0 = new Vector3();//外力の初期値
  //バネ-質点
  this.spring = [];
  this.point = [];
  this.mass = 0.05;//質点１個当たりの質量
  this.constK0 = 500;
  this.drctnK0 = 500;
  this.damping = 0.01;
  this.drag = 0.01;
  this.variation = 0.0;//変動率
  this.rate = 0.8;
  //枝
  this.numBranch = 4; //枝から分かれる枝個数
  this.numGeneration = 3;//枝の世代数
  this.length0 = 1.0;//親枝（イニシエータ）の長さ
  this.width0 = 5;//線幅
  this.width = [];
  this.alpha = 30 * DEG_TO_RAD;//分岐角
  this.scale = 70;//表示倍率
}

//-----------------------------------------------------------------
SpringMassTree2D.prototype.draw = function()
{
  var k, np1, np2;

  for (k = 0; k < this.numSpring; k++)
  {
    np1 = this.spring[k].np1; np2 = this.spring[k].np2;
    drawLine(X0 + this.scale * this.point[np1].vPos.x, Y0 - this.scale * this.point[np1].vPos.y,
     X0 +  this.scale * this.point[np2].vPos.x, Y0 - this.scale * this.point[np2].vPos.y , "black", this.spring[k].width);
  }
  //水平線
  drawLine(0, Y0, canvas.width, Y0, "black", 5);
}
//-----------------------------------------------------------------
SpringMassTree2D.prototype.create = function()
{
  var i, j, k, theta, beta, beta0, delta, nb, np1, np2;
  this.numSpring = 0;//総枝個数
  for(i = 0; i < this.numGeneration; i++){ this.numSpring += Math.pow(this.numBranch, i); }

  this.numPoint = this.numSpring + 1;
  for(i = 0; i < this.numPoint; i++) this.point[i] = new Point();
  for(i = 0; i < this.numSpring; i++) this.spring[i] = new Spring();
  
  nb = 0, np1 = 0, np2 = 0;
       
  var numBranchGen = 0;//各世代の枝総数
  beta  = [];//枝の偏角（水平面からの角度）
  beta0 = [];//枝の偏角（水平面からの角度）
         
  delta = 2*this.alpha / (this.numBranch-1);//枝間角度

  //initiator(0代目）
  this.point[0].vPos.x = 0; this.point[0].vPos.y = 0;
  this.point[1].vPos.x = 0; this.point[1].vPos.y = this.length0;
  this.spring[0].np1 = 0; this.spring[0].np2 = 1; 
  this.spring[0].length = this.spring[0].length0 = this.length0;
  this.spring[0].vDir0 = direction(this.point[0].vPos, this.point[1].vPos);  
  this.spring[0].constK = this.constK0;
  this.spring[0].drctnK = this.drctnK0;
  this.spring[0].width = this.width0;
  nb = 1; np1 = 1; np2 = 2;//次世代の枝番号とその両端の頂点番号
  
  beta[0] = Math.PI / 2.0;//偏角
  var ck = this.constK0;
  var dk = this.drctnK0;
  var wd = this.width0;
  
  var len = this.length0;//枝の長さ
  var wid = this.width0;//太さ(線幅)
  var va = this.variation;

  numBranchGen++;
  for(i = 1; i < this.numGeneration; i++)
  {
    len *= this.rate;
    ck *= this.rate * 0.5;
    dk *= this.rate * 0.3;
    wd *= this.rate * this.rate;
    if(wd < 1) wd = 1;
    k = 0;
    for (j = 0; j < numBranchGen; j++)
    {
      beta0[j] = beta[j] * (1.0 + getRandom(-va, va));
    }
    for(j = 0; j < numBranchGen; j++)
    {
      for(m = 0; m < this.numBranch; m++)
      {
        theta = m * delta - this.alpha;
        beta[k] = beta0[j] + theta * (1.0 + getRandom(-va, va));
        this.spring[nb].np1 = np1; this.spring[nb].np2 = np2;
		this.spring[nb].constK = ck;
		this.spring[nb].drctnK = dk;
		this.spring[nb].width = wd;
        this.point[np2].vPos.x = this.point[np1].vPos.x + len * Math.cos(beta[k]) * (1.0 + getRandom(-va, va)); 
        this.point[np2].vPos.y = this.point[np1].vPos.y + len * Math.sin(beta[k]) * (1.0 + getRandom(-va, va));
        this.spring[nb].length = this.spring[nb].length0 = len;
		this.spring[nb].vDir0 = direction(this.point[np1].vPos, this.point[np2].vPos);
        np2++;
        k++;
        nb++;
      }
      np1++;
    }
    numBranchGen *= this.numBranch;//現在世代の枝総数
  }
}

//-----------------------------------------------------------------------------
SpringMassTree2D.prototype.calcSM = function(dt)
{                                           
  var i, np1, np2;
  var dampingF, angle;
  var vDir1, vDir2, vFF;
  var vRelativeVelocity;
  var vG = new Vector3(0, -gravity * this.mass, 0);
  var vNormal;

  //力の初期設定値（重力を追加）
  for(i = 0; i  < this.numPoint; i++)
	this.point[i].vForce = add(this.point[i].vForce0, vG);

  //バネによる力
  for(i = 0; i < this.numSpring; i++)
  {
    //弾性力
    np1 = this.spring[i].np1;
    np2 = this.spring[i].np2;
    vDir1 = direction(this.point[np1].vPos, this.point[np2].vPos, 0);//#1から#2への単位ベクトル
    this.spring[i].length = distance(this.point[np1].vPos, this.point[np2].vPos);
    vFF = mul(this.spring[i].constK * (this.spring[i].length - this.spring[i].length0) , vDir1) ;
    this.point[np1].vForce.add(vFF) ;//vDirと同方向
    this.point[np2].vForce.sub(vFF) ;//反対方向
    //減衰力
    vRelativeVelocity = sub(this.point[np1].vVel , this.point[np2].vVel);
    dampingF = this.damping * dot(vRelativeVelocity, vDir1);
    this.point[np1].vForce.sub(mul(dampingF , vDir1));//相対速度とは反対方向
    this.point[np2].vForce.add(mul(dampingF , vDir1));//同方向

    //方向バネを考慮
    vNormal = cross(this.spring[i].vDir0, vDir1);
	vDir2 = cross(vNormal, vDir1);
	angle = getAngle_rad(this.spring[i].vDir0, vDir1);
    vFF = mul(this.spring[i].drctnK * angle / this.spring[i].length, vDir2);
    this.point[np2].vForce.sub(vFF);
    this.point[np1].vForce.add(vFF);
  }

  //オイラー法
  for(i = 1; i < this.numPoint; i++)//i = 0は根なので除く
  {
    //空気粘性抵抗（全ての質点に一様と仮定)
    this.point[i].vForce.sub(mul(this.drag, this.point[i].vVel));
    //加速度
    this.point[i].vAcc = div(this.point[i].vForce , this.mass);
    //速度
    this.point[i].vVel.add(mul(this.point[i].vAcc, dt));
   //位置
    this.point[i].vPos.add(mul(this.point[i].vVel, dt));
  }
}

