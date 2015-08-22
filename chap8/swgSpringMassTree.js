/*-----------------------------------------------------------------
  swgSpringMassTree.js
  1次元バネ質点モデルで樹木を表現
  フラクタルで3次元樹木形成
  バネ質点表示
-------------------------------------------------------------------*/

function SpringMassTree()
{
  this.numSpring;
  this.numPoint;
  this.vPos = new Vector3();//根の位置
  this.vForce0 = new Vector3();//外力の初期値
  //バネ-質点
  this.spring = [];
  this.point = [];
  this.constK = [];
  this.drctnK = [];
  this.mass = 1;//質点１個当たりの質量
  this.radius = 0.1;//質点の半径
  this.constK0 = 1000;
  this.drctnK0 = 1000;
  this.damping = 0;
  this.drag = 0;
  this.variation = 0.5;//変動率
  //幹（trunk)
  this.numTrunk = 4;
  this.lengthTrunk0 = 1.0;//幹の最下端の長さ
  this.radiusTrunk0 = 0.1;
  this.rate = 0.8;
  //枝
  this.numBranch0 = 4;//1か所の幹分岐点で分岐する枝個数
  this.numBranch = 4; //枝から分かれる枝個数
  this.lengthBranch0 = 0.6;
  this.radiusBranch0 = 0.05;
  this.alpha = 30 * DEG_TO_RAD;//分岐角
  this.beta = 30 * DEG_TO_RAD;//水平面との角度
  //表示
  this.dispType = "SMM";
}

//-----------------------------------------------------------------
SpringMassTree.prototype.draw = function()
{
  var i, r1, r2;
  
  if(this.dispType == "SMM")//ばね質点表示
  {
    //質点
    var n = this.point[0].initVertexBuffers(gl);
    for(i = 0; i < this.numPoint; i++) 
    {
      if(this.point[i].flagFixed == true){
        this.point[i].diffuse = [0.3, 0.2, 0.2, 1.0];
        this.point[i].ambient = [0.2, 0.1, 0.1, 1.0];
      }
      else
      {
	    this.point[i].diffuse  = [0.2, 0.6, 0.0, 1.0];
	    this.point[i].ambient  = [0.1, 0.4, 0.0, 1.0];
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
      this.spring[i].vSize = new Vector3(this.spring[i].radius, this.spring[i].radius, len);
      this.spring[i].vEuler = getEulerZ(this.point[r1].vPos, this.point[r2].vPos);
      this.spring[i].diffuse = [0.5, 0.5, 0.3, 1.0];
      this.spring[i].ambient = [0.4, 0.4, 0.2, 1.0];
      this.spring[i].diffuse = [0.2, 0.2, 0.2, 1.0];
      this.spring[i].shadow = this.shadow;
      this.spring[i].draw(gl, n);
    }
  }
  else if(this.dispType == "MIX" || this.dispType == "LP")
  {
    if(this.dispType == "MIX")
    {
      n = this.spring[0].initVertexBuffers(gl);
      for(i = 0; i < this.numTrunk ; i++)
      {
        r1 = this.spring[i].row1;
        r2 = this.spring[i].row2;
        this.spring[i].vPos = div(add(this.point[r1].vPos, this.point[r2].vPos), 2);
        var len = distance(this.point[r1].vPos, this.point[r2].vPos);
        this.spring[i].vSize = new Vector3(this.spring[i].radius, this.spring[i].radius, len);
        this.spring[i].vEuler = getEulerZ(this.point[r1].vPos, this.point[r2].vPos);
        this.spring[i].diffuse = [0.5, 0.5, 0.3, 1.0];
        this.spring[i].ambient = [0.4, 0.4, 0.2, 1.0];
        this.spring[i].diffuse = [0.2, 0.2, 0.2, 1.0];
        this.spring[i].shadow = this.shadow;
        this.spring[i].draw(gl, n);
      }
    }
    dummy = new Rigid();
    dummy.kind = "CHECK_PLATE";
    dummy.flagCheck = true;
    dummy.nSlice = 35;
    dummy.nStack = 35;
    var n = dummy.initVertexBuffers(gl);

    var flagLineLoc = gl.getUniformLocation(gl.program, 'u_flagLine');
    //幹、枝だけ表示
    gl.uniform1i(flagLineLoc, true);
    n = initVertexLines(this, gl);
    gl.drawArrays(gl.LINES, 0, n);
    gl.uniform1i(flagLineLoc, false);
    //質点を点で表示
    var flagPointLoc = gl.getUniformLocation(gl.program, 'u_flagPoint');
    //幹、枝だけ表示
    gl.uniform1i(flagPointLoc, true);
    n = initVertexPoints(this, gl);
    gl.drawArrays(gl.POINTS, 0, n);
    gl.uniform1i(flagPointLoc, false);
  }
}
//--------------------------------------------------------------
function initVertexLines(sm, gl) 
{
  //幹・枝を線で描画するときの座標を作成
  var vertices = []; 
  for(i = 0; i < sm.numSpring ; i++)
  {
    r1 = sm.spring[i].row1;
    r2 = sm.spring[i].row2;
    vertices.push(sm.point[r1].vPos.x); vertices.push(sm.point[r1].vPos.y); vertices.push(sm.point[r1].vPos.z);
    vertices.push(sm.point[r2].vPos.x); vertices.push(sm.point[r2].vPos.y); vertices.push(sm.point[r2].vPos.z);
  }
  var vertexBuffer = gl.createBuffer();
  // バッファオブジェクトをバインドにする
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  // バッファオブジェクトにデータを書き込む
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

  var vertexLoc = gl.getAttribLocation(gl.program, 'a_vertex');
  // a_Position変数にバッファオブジェクトを割り当てる
  gl.vertexAttribPointer(vertexLoc, 3, gl.FLOAT, false, 0, 0);

  // a_verte変数でのバッファオブジェクトの割り当てを有効化する
  gl.enableVertexAttribArray(vertexLoc);
  // バッファオブジェクトのバインドを解除する
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  
  return vertices.length/3;
}

//--------------------------------------------------------------
function initVertexPoints(sm, gl) 
{
  //幹・枝を線で描画するときの座標を作成
  var vertices = []; 
  for(i = 0; i < sm.numPoint; i++)
  {
    vertices.push(sm.point[i].vPos.x); vertices.push(sm.point[i].vPos.y); vertices.push(sm.point[i].vPos.z);
  }
  // バッファオブジェクトを作成する
  var vertexBuffer = gl.createBuffer();
  // バッファオブジェクトをバインドにする
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  // バッファオブジェクトにデータを書き込む
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

  var vertexLoc = gl.getAttribLocation(gl.program, 'a_vertex');
  // a_Position変数にバッファオブジェクトを割り当てる
  gl.vertexAttribPointer(vertexLoc, 3, gl.FLOAT, false, 0, 0);

  // a_verte変数でのバッファオブジェクトの割り当てを有効化する
  gl.enableVertexAttribArray(vertexLoc);
  // バッファオブジェクトのバインドを解除する
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  
  return vertices.length/3;
}

//-----------------------------------------------------------------
SpringMassTree.prototype.create = function()
{
  var i, j, k, m, n0, n1;
//alert(" numTrunk = " + this.numTrunk);
  var va = this.variation;//変動率
  this.numPoint = 0;
  this.numSpring = 0;
  
  var len = this.lengthTrunk0;
  var rad = this.radiusTrunk0;
  //幹
  for(i = 0; i <= this.numTrunk; i++)
  {
    this.point[i] = new Rigid();
    this.point[i].vSize = new Vector3(rad, rad, rad);
    this.point[i].vPos.x = this.vPos.x + getRandom(-va, va) * 0.1;
    this.point[i].vPos.y = this.vPos.y + getRandom(-va, va) * 0.1;
    if(i == 0) 
	  this.point[i].vPos.z = 0.0;
	else
	  this.point[i].vPos.z = this.point[i-1].vPos.z + len * (1.0 + getRandom(-va, va));

    this.numPoint++;
	if(i >= 1){
	  len *= this.rate;
	  rad *= this.rate;
    }
  }
  //バネに接続する質点番号とバネの方向
  rad = this.radiusTrunk0 * 0.8;
  var ck = this.constK0 ;
  var dk = this.drctnK0 ;
  for(i = 0; i < this.numTrunk; i++)
  {
    this.spring[i] = new Rigid();
    this.spring[i].radius = rad;
    this.spring[i].row1 = i;
    this.spring[i].row2 = i+1;
    this.spring[i].length0 = distance(this.point[i].vPos, this.point[i+1].vPos);
	this.spring[i].vDir0 = direction(this.point[i].vPos, this.point[i+1].vPos);

	this.constK[i] = ck;
	this.drctnK[i] = dk;
	rad *= this.rate;
	ck *= this.rate;
	dk *= this.rate;
	this.numSpring ++;
  }
  //親枝
  len = this.lengthBranch0;
  rad = this.radiusBranch0;
  var gamma = 2.0 * Math.PI / this.numBranch0;//取り付け位置（x軸からの経度）
  for(i = 1; i <= this.numTrunk; i++)
  {
    var ang = 50 * DEG_TO_RAD * getRandom(-va, va);
	for(j = 0; j < this.numBranch0; j++)
	{ 
      this.point[this.numPoint] = new Rigid();
      this.point[this.numPoint].vSize = new Vector3(2.0*rad, 2.0*rad, 2.0*rad);
	  this.point[this.numPoint].vPos.x = this.point[i].vPos.x + len * Math.cos(this.beta) * Math.cos(gamma * j + ang) * (1.0 + getRandom(-va, va));
	  this.point[this.numPoint].vPos.y = this.point[i].vPos.y + len * Math.cos(this.beta) * Math.sin(gamma * j + ang) * (1.0 + getRandom(-va, va));
	  this.point[this.numPoint].vPos.z = this.point[i].vPos.z + len * Math.sin(this.beta) * (1.0 + getRandom(-va, va));
	  this.numPoint ++;
	}
	len *= this.rate;
	rad *= this.rate;
  }
  //バネに接続する質点番号と方向
  rad = this.radiusBranch0 * 0.8;
  ck = this.constK0 * this.rate ;//* 0.5;
  dk = this.drctnK0 * this.rate ;//* 0.5;
  for(i = 1; i <= this.numTrunk; i++)
  {
    for(j = 0; j < this.numBranch0; j++)
	{
	  n0 = this.numTrunk+1 + (i-1)*this.numBranch0 + j;//親枝質点番号
      this.spring[this.numSpring] = new Rigid();
      this.spring[this.numSpring].kind = "CYLINDER";
	  this.spring[this.numSpring].radius = rad;
	  this.spring[this.numSpring].row1 = i;
	  this.spring[this.numSpring].row2 = n0;
	  this.spring[this.numSpring].length0 = distance(this.point[i].vPos, this.point[n0].vPos);
	  this.spring[this.numSpring].vDir0 = direction(this.point[i].vPos, this.point[n0].vPos);
	  this.constK[this.numSpring] = ck;
	  this.drctnK[this.numSpring] = dk;
	  this.numSpring ++;
	}
	rad *= this.rate;
	ck *= this.rate * 0.5;
	dk *= this.rate * 0.5;
  }

  //子枝
  len = this.lengthBranch0 * this.rate;
  rad = this.radiusBranch0 * this.rate;
  this.beta *= this.rate;//M_PI / 10.0;//水平面との角度
  var delta = 2*this.alpha / (this.numBranch-1);
  var theta;
  for(i = 1; i <= this.numTrunk; i++)
  {
	for(j = 0; j < this.numBranch0; j++)
	{
	  for(k = 0; k < this.numBranch; k++)
	  {
	    theta = gamma * j + k * delta - this.alpha;
	    n0 = this.numTrunk+1 + (i-1)*this.numBranch0 + j;//親枝質点番号
        this.point[this.numPoint] = new Rigid();
        this.point[this.numPoint].kind = "SPHERE";
		this.point[this.numPoint].vSize = new Vector3(2.0*rad, 2.0*rad, 2.0*rad);
        this.point[this.numPoint].vPos.x = this.point[n0].vPos.x + len * Math.cos(this.beta) * Math.cos(theta) *  (1.0 + getRandom(-va, va));
		this.point[this.numPoint].vPos.y = this.point[n0].vPos.y + len * Math.cos(this.beta) * Math.sin(theta) * (1.0 + getRandom(-va, va));
		this.point[this.numPoint].vPos.z = this.point[n0].vPos.z + len * Math.sin(this.beta) * (1.0 + getRandom(-va, va));
		this.numPoint ++;
	  }
	}
	len *= this.rate;
	rad *= this.rate;
  }
  //バネに接続する質点番号と方向
  rad = this.radiusBranch0 * this.rate;
  ck = this.constK0 * this.rate * 0.2;
  dk = this.drctnK0 * this.rate * 0.2;
  n1 =  this.numTrunk + 1 + this.numTrunk * this.numBranch0;//子枝の最初の質点番号
  for(i = 1; i <= this.numTrunk; i++)
  {
    for(j = 0; j < this.numBranch0; j++)//親枝番号
	{
	  for(k = 0; k < this.numBranch; k++)//子枝番号
	  {
		n0 = this.numTrunk + 1 + (i-1)*this.numBranch0 + j;//親枝質点番号
        this.spring[this.numSpring] = new Rigid();
        this.spring[this.numSpring].kind = "CYLINDER";
		this.spring[this.numSpring].radius = rad;
		this.spring[this.numSpring].row1 = n0;
		this.spring[this.numSpring].row2 = n1;
		this.spring[this.numSpring].length0 = distance(this.point[n0].vPos, this.point[n1].vPos);
		this.spring[this.numSpring].vDir0 = direction(this.point[n0].vPos, this.point[n1].vPos);
		this.constK[this.numSpring] = ck;
		this.drctnK[this.numSpring] = dk;
		this.numSpring ++;
		n1++;
	  }
	}
	rad *= this.rate;
	ck *= this.rate * 0.5;
	dk *= this.rate * 0.5;
  }

  //孫枝
  len = this.lengthBranch0 * this.rate * this.rate;
  rad = this.radiusBranch0 * this.rate;
  this.beta *= this.rate;
  n0 = this.numTrunk + 1 + this.numTrunk*this.numBranch0;//最初の子枝質点番号
  for(i = 1; i <= this.numTrunk; i++)
  {
	for(j = 0; j < this.numBranch0; j++)
	{
      for(k = 0; k < this.numBranch; k++)
	  {
		for(m = 0; m < this.numBranch; m++)
		{
		  theta = gamma * j + (k+m) * delta - 2*this.alpha;//（x軸からの経度）
          this.point[this.numPoint] = new Rigid();
          this.point[this.numPoint].kind = "SPHERE";
		  this.point[this.numPoint].vSize = new Vector3(2.0*rad, 2.0*rad, 2.0*rad);
		  this.point[this.numPoint].vPos.x = this.point[n0].vPos.x + len * Math.cos(this.beta) * Math.cos(theta) * (1.0 + getRandom(-va, va));
		  this.point[this.numPoint].vPos.y = this.point[n0].vPos.y + len * Math.cos(this.beta) * Math.sin(theta) * (1.0 + getRandom(-va, va));
		  this.point[this.numPoint].vPos.z = this.point[n0].vPos.z + len * Math.sin(this.beta) * (1.0 + getRandom(-va, va));
		  this.numPoint ++;
		}
		n0++;
	  }
	}
	len *= this.rate * 0.8;
	rad *= this.rate;
  }

  //バネに接続する質点番号と方向
  rad = this.radiusBranch0 * this.rate * this.rate;
  ck = this.constK0 * this.rate * 0.1;//this.rate * this.rate;// * 0.2;
  dk = this.drctnK0 * this.rate * 0.001;//this.rate * this.rate;//* 0.001;
  n0 = this.numTrunk + 1 + this.numTrunk*this.numBranch0;//最初の子枝質点番号
  n1 =  this.numTrunk + 1 + this.numTrunk * this.numBranch0 * (1 + this.numBranch);//最初の孫枝質点番号
  for(i = 1; i <= this.numTrunk; i++)
  {
    for(j = 0; j < this.numBranch0; j++)//親枝番号
    {
	  for(k = 0; k < this.numBranch; k++)//子枝番号
	  {
		for(m = 0; m < this.numBranch; m++)
		{
          this.spring[this.numSpring] = new Rigid();
          this.spring[this.numSpring].kind = "CYLINDER";
		  this.spring[this.numSpring].radius = rad;
		  this.spring[this.numSpring].row1 = n0;
		  this.spring[this.numSpring].row2 = n1;
		  this.spring[this.numSpring].length0 = distance(this.point[n0].vPos, this.point[n1].vPos);
		  this.spring[this.numSpring].vDir0 = direction(this.point[n0].vPos, this.point[n1].vPos);
		  this.constK[this.numSpring] = ck;
		  this.drctnK[this.numSpring] = dk;
		  this.numSpring ++;
		  n1++;
		}
		n0++;
      }
	}
	rad *= this.rate * 0.5;
	ck *= this.rate * 0.5;
	dk *= this.rate * 0.5;
  }
  
  for(i = 0; i < this.numPoint; i++){
    this.point[i].kind = "SPHERE";
    this.point[i].nSlice = 6;
    this.point[i].nStack = 6;
  }
  for(i = 0; i < this.numSpring; i++){
    this.spring[i].kind = "CYLINDER";
    this.spring[i].radiusRatio = 0.9;
    this.spring[i].nSlice = 6;
  }
}

//-----------------------------------------------------------------------------
SpringMassTree.prototype.motion = function(dt)
{                                           
  var i, r1, r2;
  var dampingF, angle;
  var vDir1, vDir2, vFF;
  var vRelativeVelocity;
  var vNormal;

  //力の初期設定値（重力を追加）
  for(i = 0; i  < this.numPoint; i++)
  {
	this.point[i].vForce = add(this.point[i].vForce0, new Vector3(0.0, 0.0, -gravity * this.mass));
  }

  //バネによる力
  for(i = 0; i < this.numSpring; i++)
  {
    //弾性力
    r1 = this.spring[i].row1;
    r2 = this.spring[i].row2;
    vDir1 = direction(this.point[r1].vPos, this.point[r2].vPos);//#1から#2への単位ベクトル
    len = distance(this.point[r1].vPos, this.point[r2].vPos);
    vFF = mul(this.constK[i] * (len - this.spring[i].length0) , vDir1) ;
    this.point[r1].vForce.add(vFF) ;//vDirと同方向
    this.point[r2].vForce.sub(vFF) ;//反対方向
    //減衰力
    vRelativeVelocity = sub(this.point[r1].vVel , this.point[r2].vVel);
    dampingF = this.damping * dot(vRelativeVelocity, vDir1);
    this.point[r1].vForce.sub(mul(dampingF , vDir1));//相対速度とは反対方向
    this.point[r2].vForce.add(mul(dampingF , vDir1));//同方向

    //方向バネを考慮
    vNormal = cross(this.spring[i].vDir0, vDir1);
	vDir2 = cross(vNormal, vDir1);
	angle = getAngle_rad(this.spring[i].vDir0, vDir1);
    vFF = mul(this.drctnK[i] * angle / len, vDir2);
    this.point[r2].vForce.sub(vFF) ;
    this.point[r1].vForce.add(vFF);//vDir2と同方向
  }

  //粘性抵抗と床面処理
  for(i = 1; i < this.numPoint; i++)
  {
    if(this.point[i].flagFixed) continue; //固定

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
    this.point[i].vAcc = div(this.point[i].vForce , this.mass);
    //速度
    this.point[i].vVel.add(mul(this.point[i].vAcc, dt));

    //位置
    this.point[i].vPos.add(mul(this.point[i].vVel, dt));			
  }
}

