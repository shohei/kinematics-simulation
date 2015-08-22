/*----------------------------------------------
  swgSpringMassWalk.js
  1次元バネ質点モデルの歩行シミュレーション
-----------------------------------------------*/
var gravity = 9.8;

function SpringMassWalk()
{
  this.actionType = 1;//1足歩行、2足歩行
  this.mode = 0;//歩行モード
  this.numSpring = 1;
  this.numPoint = this.numSpring + 1;
  this.mass = 0.1;//質点１個当たりの質量(kg)
  this.constK = 200;//構造バネ1個当たりのバネ定数
  this.drctnK = 20;//方向バネ
  this.damping = 0.1;//0.5;
  this.drag = 0.1;

  this.length0 = 1.5;//脚バネの自然長
  this.radius = 0.1 ;//バネの半径
  this.dir; //進行方向（x軸からの偏角）
  this.dir0;//バネの初期設定方向
  this.theta1 = 20; //前傾角
  this.theta2 = -10;//後傾角
  this.vPos = this.vPos0 = new Vector3();
  this.vVel = new Vector3();
  this.vForce = new Vector3(); //外力の初期値
  this.vForce0 = new Vector3();//外力の初期値
  this.spring = [];
  this.point = [];
  this.shadow = 0;
  this.rootNo = 1; 
}
//-----------------------------------------------------------------
SpringMassWalk.prototype.create = function()
{
  //質点のサイズ,質量
  for(var i = 0; i < 5; i++)
  {
    this.point[i] = new Rigid();
    this.point[i].kind = "SPHERE";
	this.point[i].mass = this.mass;
    this.point[i].vSize = new Vector3(2*this.radius, 2 * this.radius, 2 * this.radius);
  }
  //バネ
  for(var i = 0; i < 4; i++)
  {
    this.spring[i] = new Rigid();
    this.spring[i].kind = "CYLINDER";
	this.spring[i].radius = this.radius;
	this.spring[i].radiusRatio = 1;
  }
  if(this.actionType == 1)
  {
    this.numSpring = 1;
    this.numPoint = 2;
    this.rootNo = 1;
    this.spring[0].length0 = this.length0;

	//足（下の質点）
	this.point[0].vPos = add(new Vector3(0.0, 0.0, this.radius), this.vPos);
	//重心（上の質点）
	this.point[1].vPos = add(new Vector3(0.0, 0.0, this.radius + this.length0), this.vPos);
	//脚(spring)
    this.spring[0].row1 = 0; this.spring[0].row2 = 1;
	//バネの方向
	this.spring[0].vDir0 = new Vector3(0.0, 0.0, 1.0);
  }
  else if(this.actionType == 2)//2本脚
  {
    this.numSpring = 4;
	this.numPoint = 5;
	this.rootNo = 4;
	var wid = 0.2 * this.length0;
	//左足
	this.point[0].vPos = add(new Vector3(-wid, 0.0, this.radius), this.vPos);
	//右足
	this.point[1].vPos = add(new Vector3( wid, 0.0, this.radius), this.vPos);
	//左腰
	this.point[2].vPos = add(new Vector3(-wid, 0.0, this.radius + this.length0), this.vPos);
	//右腰
	this.point[3].vPos = add(new Vector3( wid, 0.0, this.radius + this.length0), this.vPos);
	//root（上の中心質点）
	this.point[4].vPos = add(new Vector3( 0.0, 0.0, this.radius + this.length0), this.vPos);
	//左脚(spring)
    this.spring[0].row1 = 0; this.spring[0].row2 = 2;
	//右脚(spring)
    this.spring[1].row1 = 1; this.spring[1].row2 = 3;
	//左腰(spring)
    this.spring[2].row1 = 2; this.spring[2].row2 = 4;
	//左腰(spring)
    this.spring[3].row1 = 4; this.spring[3].row2 = 3;
  }
  //バネの自然長と方向ベクトル
  var n1, n2;
  for(var i = 0; i < this.numSpring; i++)
  {
	n1 = this.spring[i].row1; n2 = this.spring[i].row2;
	this.spring[i].length0 = distance(this.point[n1].vPos, this.point[n2].vPos);
	this.spring[i].vDir0 = direction(this.point[n1].vPos, this.point[n2].vPos);
  }

  //進行方向初期値がy軸方向でないとき質点の位置/バネの方向ベクトルも変える
  var alpha = this.dir0 - Math.PI/2.0;
  if(alpha != 0.0)
  {
    for(var i = 0; i < this.numSpring; i++) this.spring[i].vDir0.rotZ_rad(alpha);
	//質点の座標
	for(i = 0; i < this.numPoint; i++) this.point[i].vPos.rotZ_radC(this.point[this.rootNo].vPos, alpha);
  }
}

//-----------------------------------------------------------------
SpringMassWalk.prototype.draw = function(gl)
{
  var i, r1, r2;

  //ばね質点表示
  //質点
  var n = this.point[0].initVertexBuffers(gl);
  for(i = 0; i < this.numPoint; i++) 
  {
    if(this.point[i].flagFixed == true)
    {
      this.point[i].diffuse = [0.8, 0.2, 0.2, 1.0];
      this.point[i].ambient = [0.4, 0.1, 0.1, 1.0];
    }
    else
    {
	  this.point[i].diffuse  = [0.2, 0.9, 0.9, 1.0];
	  this.point[i].ambient  = [0.1, 0.5, 0.5, 1.0];
    }
    this.point[i].shadow = this.shadow;
    this.point[i].draw(gl, n);
  }

  //バネ
  n = this.spring[0].initVertexBuffers(gl);
  for(i = 0; i < this.numSpring ; i++)
  {
    r1 = this.spring[i].row1;
    r2 = this.spring[i].row2;
    this.spring[i].vPos = div(add(this.point[r1].vPos, this.point[r2].vPos), 2);
    var len = distance(this.point[r1].vPos, this.point[r2].vPos);
    this.spring[i].vSize = new Vector3(this.radius, this.radius, len);
    this.spring[i].vEuler = getEulerZ(this.point[r1].vPos, this.point[r2].vPos);
    this.spring[i].shadow = this.shadow;
    this.spring[i].draw(gl, n);
  }
}
//-------------------------------------------------------------------
SpringMassWalk.prototype.walk = function(tt)
{
  var i, theta, thetaDeg, dist;
  var cc = Math.cos(this.dir);
  var ss = Math.sin(this.dir);
  var vDirection = new Vector3(cc, ss , 0.0);//進行方向のベクトル

  if(this.actionType == 1)//1本あし
  {
	//rootと足の水平方向距離（符号付き）
	dist = dot(sub(this.point[1].vPos, this.point[0].vPos), vDirection);

	//脚の角度
	theta = Math.atan2(dist, this.point[1].vPos.z - this.point[0].vPos.z); 
    thetaDeg = theta * RAD_TO_DEG;
	//rootには一定の水平速度を与える
	this.point[1].vVel.x = this.speed * cc;
	this.point[1].vVel.y = this.speed * ss;

	if(this.mode == 0)
	{//足を固定
	  this.point[0].flagFixed = true;
	  if(thetaDeg > this.theta1) this.mode = 1;
	}
	else if(this.mode == 1)
	{//足を自由
	  this.point[0].flagFixed = false;
	  if(thetaDeg < this.theta2) this.mode = 0;
	}
  }
  else if(this.actionType == 2 )
  {
    var thetaDegL, thetaDegR;
		
	//左脚の水平方向距離（符号付き）
	dist = dot(sub(this.point[2].vPos, this.point[0].vPos), vDirection);
	//左脚の角度
	theta = Math.atan2(dist, this.point[2].vPos.z - this.point[0].vPos.z); 
	thetaDegL = theta * RAD_TO_DEG;
	//右脚の水平方向距離（符号付き）
	dist = dot(sub(this.point[3].vPos, this.point[1].vPos), vDirection);
	//右脚の角度
	theta = Math.atan2(dist, this.point[3].vPos.z - this.point[1].vPos.z); 
	thetaDegR = theta * RAD_TO_DEG;
	
	for(i = 2; i < this.numPoint; i++)
	{
	  this.point[i].vVel.x = this.speed * cc;
	  this.point[i].vVel.y = this.speed * ss;
	}

	if(this.mode == 0)
	{//左足を固定，右足出す,
	  this.point[0].flagFixed = true;
	  this.point[1].flagFixed = false;
	  this.point[1].vVel.x = 2.0 * this.speed * cc;
	  this.point[1].vVel.y = 2.0 * this.speed * ss;
	  if(thetaDegL > this.theta1) this.mode = 1;
	}
	else if(this.mode == 1)
	{//右足固定，左足出す
	  this.point[0].flagFixed = false;
	  this.point[1].flagFixed = true;
	  this.point[0].vVel.x = 2.0 * this.speed * cc;
	  this.point[0].vVel.y = 2.0 * this.speed * ss;
	  if(thetaDegR > this.theta1) this.mode = 0;
	}
  }
 
  //進行方向が変化したときバネの方向ベクトル,質点の位置も変える
  var alpha = this.dir - this.dir0;
  if(alpha != 0.0)
  {
    //バネの方向
	for(i = 0; i < this.numSpring; i++) this.spring[i].vDir0.rotZ_rad(alpha);
	//質点の座標
	for(i = 0; i < this.numPoint; i++) this.point[i].vPos.rotZ_radC(this.point[this.rootNo].vPos, alpha);
	this.dir0 = this.dir;
  }
  this.calcSpringMass(tt);
}

//-----------------------------------------------------------------------------
//1次元のバネマスモデル(方向バネも考慮，３次元空間で運動)
SpringMassWalk.prototype.calcSpringMass = function(tt)
{                                           
  var i, j, r1, r2;
  var vDir1 = new Vector3();//hinge中心から#1へ向かう単位方向ベクトル(他にも使用)
  var vDir2 = new Vector3();//hinge中心から#2へ向かう単位方向ベクトル(他にも使用)
  var vFF = new Vector3();
  var vRelativeVel = new Vector3();
  var vNormal = new Vector3();
  var vG = new Vector3(0.0, 0.0, -gravity * this.mass);//重力ベクトル
  var dampingF, len, len1, len2, angle;
  var angle0 = Math.PI;
  //力の初期値を重力だけとする
  for(i = 0; i  < this.numPoint; i++) this.point[i].vForce.copy(vG);

  //バネによる力
  for(i = 0; i < this.numSpring; i++)
  {
    //構造バネの弾性力
    r1 = this.spring[i].row1;
    r2 = this.spring[i].row2;
    vDir1 = direction(this.point[r1].vPos , this.point[r2].vPos);//#1から#2への単位ベクトル
    len = distance(this.point[r1].vPos, this.point[r2].vPos);
    vFF = mul(this.constK * (len - this.spring[i].length0) , vDir1) ;
    this.point[r1].vForce.add(vFF) ;//vDirと同方向
    this.point[r2].vForce.sub(vFF) ;//反対方向
    //減衰力
    vRelativeVel = sub(this.point[r1].vVel , this.point[r2].vVel);
    dampingF = this.damping * dot(vRelativeVel, vDir1);
    this.point[r1].vForce.sub(mul(dampingF , vDir1));//相対速度とは反対方向
    this.point[r2].vForce.add(mul(dampingF , vDir1));//同方向

    //方向バネを考慮 
    vDir1 = direction(this.point[r1].vPos, this.point[r2].vPos);
    vNormal = cross(this.spring[i].vDir0, vDir1);
	vDir2 = cross(vNormal, vDir1);
	angle = getAngle_rad(this.spring[i].vDir0, vDir1);
    vFF = mul(this.drctnK * angle / len, vDir2);
    this.point[r2].vForce.sub(vFF) ;
    this.point[r1].vForce.add(vFF);//vDir2と同方向
  }

  //粘性抵抗,床面処理,数値計算
  for(i = 0; i < this.numPoint; i++)
  {
    if(this.point[i].flagFixed) continue;
    //空気粘性抵抗（全ての質点に一様と仮定)
    this.point[i].vForce.sub(mul(this.drag, this.point[i].vVel));
    //床面処理
    if(this.point[i].vPos.z < this.radius)
    {
      //床面上に制限
      this.point[i].vPos.z = this.radius;
    }
    //Euler法
    //加速度
    var vAcc = div(this.point[i].vForce , this.mass);
    //速度
    this.point[i].vVel.add(mul(vAcc, tt));
    //位置
    this.point[i].vPos.add(mul(this.point[i].vVel, tt));
  }
  this.vPos = this.point[0].vPos;
  
}






