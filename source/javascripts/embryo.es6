import './three-mouse-event.es6';
import './ConvexGeometry';

THREE.Vector3.prototype.mix = function(y, a) {
  return this.multiplyScalar(1 - a).add(y.clone().multiplyScalar(a))
};

class Embryo {

  constructor(data, container, width, height, callback) {

    //* data : array of contributions
    //* contribution
    //* {
    //*   image: DOMImage
    //*   text: String
    //* }
    this.data = data;
    this.createCallback = callback;

    //テクスチャの作成
    var loadedNum = 0;
    data.forEach((contribution, index) => {
      var image = new Image();
      image.onload = () => {
        var texture = Embryo.createTexture(image);
        this.data[index].texture = texture;
        loadedNum++;
        if(loadedNum === data.length) {
          this.initialize(container, width, height);
        }
      };
      image.src = './contributes/image/' + contribution._id;
    });

    return this;

  }

  initialize(container, width, height) {
    this.width = width;
    this.height = height;
    this.isHidden = false;

    //init scene
    var scene = new THREE.Scene();

    //init camera
    var fov = 60;
    var aspect = width / height;
    var camera = new THREE.PerspectiveCamera(fov, aspect);
    camera.position.set(0, 0, (height / 2) / Math.tan((fov * Math.PI / 180) / 2));
    camera.lookAt(new THREE.Vector3(0, 0, 0));
    scene.add(camera);

    //init renderer
    var renderer = new THREE.WebGLRenderer({alpha: true, antialias: true});
    renderer.setSize(width, height);
    renderer.setClearColor(0xcccccc, 0);
    container.appendChild(renderer.domElement);

    //init controls
    var controls = new THREE.TrackballControls(camera, renderer.domElement);

    //watch mouse events
    scene.watchMouseEvent(renderer.domElement, camera);

    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.controls = controls;

    //生成
    this.create(this.createCallback);

    this.count = 0;

    //console.log(this.frames);

    var update = function(){
      controls.update();
      renderer.render(scene, camera);
      //scene.handleMouseEvent();
      this.count++;
      this.moveVertices().rotate();
      requestAnimationFrame(update);
    }.bind(this);
    update();

    return this;

  }

  create(callback) {
    this.geometry = Embryo.createGeometry(100, this.data.length);
    this.frames = Embryo.createFrames(this.geometry, this.data);
    this.frames.children && this.frames.children.forEach((frame) => {//マウスイベントの設定
      frame.onclick = (intersect) => {
        if(typeof this.onselect === 'function') {
          frame.data && this.onselect(frame.data);
        }
      };
      //frame.onmouseover = (intersect) => {
      //  intersect.face.mouseon = true;
      //};
    });
    this.scene.add(this.frames);
    if(typeof callback === 'function') {
      callback();
    }

    return this;
  }

  //三角の面で構成される多面体の作成
  static createGeometry(radius, surfaceNumber) {
    var vertices = [];
    surfaceNumber = (surfaceNumber < 4) ? 4 : surfaceNumber;//４以下は不可
    surfaceNumber = (surfaceNumber & 1) ? (surfaceNumber + 1) : surfaceNumber;//奇数は不可(より大きい偶数に直す)
    for(var i = 0, l = (2 + surfaceNumber / 2); i < l; i++) {
      vertices[i] = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5);//球状にランダムに点を打つ
      vertices[i].setLength(radius);
      vertices[i].originalLength = radius;
    }
    return new THREE.ConvexGeometry(vertices);
  }

  static createFrames(geometry, data) {
    var vertextShader = '' +
      'varying vec4 vPosition;' +
      'void main() {' +
      '  gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);' +
      '  vPosition = gl_Position;' +
      '}';

    var fragmentShader = '' +
      'uniform sampler2D texture;' +
      'uniform float opacity;' +
      'varying vec4 vPosition;' +
      'void main(void){' +
      '  vec4 textureColor = texture2D(texture, vec2((1.0 + vPosition.x / 210.0) / 2.0, (1.0 + vPosition.y / 210.0) / 2.0));' +
      '  textureColor.w = opacity;' +
      '  gl_FragColor = textureColor;' +
      //'      gl_FragColor = vec4((vPosition.x / 800.0 + 1.0) / 2.0, (vPosition.y / 800.0 + 1.0) / 2.0, 0, 0);' +
      '}';

    var frames = new THREE.Object3D();
    geometry.faces.forEach(function(face, index) {
      var a = geometry.vertices[face.a], b = geometry.vertices[face.b], c = geometry.vertices[face.c];

      //create geometry
      var frameGeometry = new THREE.Geometry();
      frameGeometry.vertices = [a, b, c];
      frameGeometry.faces = [new THREE.Face3(0, 1, 2)];
      frameGeometry.computeFaceNormals();
      frameGeometry.computeVertexNormals();

      //create material
      var frameMaterial = new THREE.ShaderMaterial({
        vertexShader: vertextShader,
        fragmentShader: fragmentShader,
        uniforms: {
          texture: { type: "t", value: data[index] ? data[index].texture : null },
          opacity: { type: "f", value: 1.0 },
          offsetY: { type: "f", value: 0 }
        }
      });

      var mesh = new THREE.Mesh(frameGeometry, frameMaterial);
      mesh.data = data[index];

      frames.add(mesh);
    });
    return frames;
  }

  static createTexture(image) {
    var texture = new THREE.Texture(this.getSuitableImage(image));
    //texture.magFilter = texture.minFilter = THREE.NearestFilter;
    texture.needsUpdate = true;
    return texture;
  }

  //画像サイズを調整
  static getSuitableImage(image) {
    var w = image.naturalWidth, h = image.naturalHeight;
    //var size = Math.pow(2, Math.log(Math.min(w, h)) / Math.LN2 | 0); // largest 2^n integer that does not exceed
    var size = 128;
    if (w !== h || w !== size) {
      var canvas = document.createElement('canvas');
      var offsetX = h / w > 1 ? 0 : (w - h) / 2;
      var offsetY = h / w > 1 ? (h - w) / 2 : 0;
      var clipSize = h / w > 1 ? w : h;
      canvas.height = canvas.width = size;
      canvas.getContext('2d').drawImage(image, offsetX, offsetY, clipSize, clipSize, 0, 0, size, size);
      image = canvas;
    }
    return image;
  }

  moveVertices() {
    //console.log(this.frames.children[0].geometry.vertices[0]);
    this.frames.children.forEach((frame) => {
      var face = frame.geometry.faces[0];
      frame.geometry.vertices.forEach((vertex, index) => {
        vertex.mix(face.normal, 0.1).setLength(vertex.originalLength + 5 * Math.cos(this.count/20 + index * 10));
    });
      frame.geometry.verticesNeedUpdate = true;
      frame.geometry.computeFaceNormals();
    });

    return this;
  }

  rotate() {
    this.frames.rotation.set(0, this.count/500, 0);
  }

  /*
    three.jsオブジェクトの削除
   */
  clear() {
    this.geometry && this.geometry.dispose();
    this.frames.children.forEach(function(frame) {
      frame.geometry.dispose();
      frame.material.dispose();
    });
    this.scene.remove(this.frames);

    return this;
  }

  /*
    contributionの追加
    @param contribution {Object} 投稿
   */
  addContribution(contribution, callback) {
    var image = new Image();
    image.onload = () => {
      contribution.texture = Embryo.createTexture(image);
      this.data.push(contribution);
      this.clear().create(callback);//リセット
    };
    image.src = './contributes/image/' + contribution._id;

    return this;
  }

  setSize(width, height) {
    this.renderer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    return this;
  }
    
  toggle(duration) {
      console.log(duration);
    var TOTAL_COUNT = duration / (1000 / 60);
    var OFFSET = 200;
    var SCALE = 0.6;
    var count = 0;
    var startY = this.frames.position.y;
    var endY = this.isHidden ? 0 : -OFFSET;
    var startScale = this.frames.scale.x;
    var endScale = this.isHidden ? 1 : SCALE;
    var animate = () => {
        console.log("animate");
      var n = count / TOTAL_COUNT - 1;
      n = Math.pow(n , 5) + 1;
      this.frames.position.set(0, startY * (1 - n) + endY * n, 0);
      var s = startScale * (1 - n) + endScale * n;
      this.frames.scale.set(s, s, s);
      if(count < TOTAL_COUNT) {
        count++;
        window.requestAnimationFrame(animate);
      }
    }
    window.requestAnimationFrame(animate);
    this.isHidden = !this.isHidden;
  }

}

export default Embryo;