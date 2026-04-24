// ============================================
// SCRIPT PARA CARREGAR E CONTROLAR O MODELO 3D
// ============================================
// CONTROLOS:
//   Botão ESQUERDO  → orbitar / rodar em volta
//   Botão DIREITO   → "andar pelo arboreto" (desloca câmara no plano)
//   Roda do rato    → zoom in/out

window.addEventListener('DOMContentLoaded', function () {

    // 1️⃣ CONFIGURAÇÃO INICIAL
    const container = document.getElementById('modelo-3d-container');
    const loadingMessage = document.getElementById('loading-message');

    if (!container) {
        console.error('Container do modelo 3D não encontrado!');
        return;
    }

    // 2️⃣ CENA
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xd6ede8);
    scene.fog = new THREE.Fog(0xd6ede8, 200, 800);

    // 3️⃣ CÂMARA
    const camera = new THREE.PerspectiveCamera(
        40,
        container.clientWidth / container.clientHeight,
        0.1,
        5000
    );

    // 4️⃣ RENDERER
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // 5️⃣ LUZES
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfff5e0, 1.0);
    sunLight.position.set(50, 80, 30);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width  = 2048;
    sunLight.shadow.mapSize.height = 2048;
    scene.add(sunLight);

    const fillLight = new THREE.DirectionalLight(0xc8e8ff, 0.3);
    fillLight.position.set(-30, 20, -20);
    scene.add(fillLight);

    // 6️⃣ ORBIT CONTROLS
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping  = true;
    controls.dampingFactor  = 0.06;
    controls.minDistance    = 5;
    controls.maxDistance    = 500;
    controls.maxPolarAngle  = Math.PI / 2.05;
    controls.enablePan      = false;
    controls.mouseButtons   = {
        LEFT:   THREE.MOUSE.ROTATE,
        MIDDLE: THREE.MOUSE.DOLLY,
    };

    // 7️⃣ NAVEGAÇÃO COM BOTÃO DIREITO
    let isRightDragging = false;
    let rightPrevX = 0;
    let rightPrevY = 0;

    function panSpeed() {
        return controls.object.position.distanceTo(controls.target) * 0.0012;
    }

    renderer.domElement.addEventListener('pointerdown', function (e) {
        if (e.button === 2) {
            isRightDragging = true;
            rightPrevX = e.clientX;
            rightPrevY = e.clientY;
            renderer.domElement.setPointerCapture(e.pointerId);
            e.preventDefault();
        }
    });

    renderer.domElement.addEventListener('pointermove', function (e) {
        if (!isRightDragging) return;
        const dx = e.clientX - rightPrevX;
        const dy = e.clientY - rightPrevY;
        rightPrevX = e.clientX;
        rightPrevY = e.clientY;
        const speed = panSpeed();
        const forward = new THREE.Vector3();
        camera.getWorldDirection(forward);
        forward.y = 0;
        forward.normalize();
        const right = new THREE.Vector3();
        right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
        const move = new THREE.Vector3();
        move.addScaledVector(right, -dx * speed);
        move.addScaledVector(forward, dy * speed);
        camera.position.add(move);
        controls.target.add(move);
    });

    renderer.domElement.addEventListener('pointerup', function (e) {
        if (e.button === 2) {
            isRightDragging = false;
            renderer.domElement.releasePointerCapture(e.pointerId);
        }
    });

    renderer.domElement.addEventListener('contextmenu', function (e) {
        e.preventDefault();
    });

    // Suporte touch
    let touchPrev = null;
    renderer.domElement.addEventListener('touchstart', function (e) {
        if (e.touches.length === 2) {
            touchPrev = {
                x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
                y: (e.touches[0].clientY + e.touches[1].clientY) / 2
            };
        }
    }, { passive: true });

    renderer.domElement.addEventListener('touchmove', function (e) {
        if (e.touches.length !== 2 || !touchPrev) return;
        const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        const dx = cx - touchPrev.x;
        const dy = cy - touchPrev.y;
        touchPrev = { x: cx, y: cy };
        const speed = panSpeed();
        const forward = new THREE.Vector3();
        camera.getWorldDirection(forward);
        forward.y = 0;
        forward.normalize();
        const right = new THREE.Vector3();
        right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
        const move = new THREE.Vector3();
        move.addScaledVector(right,   -dx * speed * 1.5);
        move.addScaledVector(forward,  dy * speed * 1.5);
        camera.position.add(move);
        controls.target.add(move);
        controls.update();
    }, { passive: true });

    renderer.domElement.addEventListener('touchend', function () {
        touchPrev = null;
    }, { passive: true });

    // 8️⃣ LOADER DO MODELO
    const loader = new THREE.GLTFLoader();

loader.load(
    'ARBORETO FINAL.glb',

        function (gltf) {
            const model = gltf.scene;
            model.traverse(function (node) {
                if (node.isMesh) {
                    node.castShadow    = true;
                    node.receiveShadow = true;
                }
            });
            scene.add(model);

            const box    = new THREE.Box3().setFromObject(model);
            const size   = box.getSize(new THREE.Vector3());
            const center = box.getCenter(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.z);

            model.position.sub(center);

            const camHeight  = maxDim * 0.50;
            const camDist    = maxDim * 0.55;
            const camOffsetX = maxDim * 0.08;

            camera.position.set(camOffsetX, camHeight, camDist);

            const groundCenter = new THREE.Vector3(0, (box.min.y - center.y) + size.y * 0.05, 0);
            controls.target.copy(groundCenter);
            camera.lookAt(controls.target);
            controls.update();

            if (loadingMessage) loadingMessage.style.display = 'none';
            container.classList.add('loaded');

            sunLight.shadow.camera.near   = 1;
            sunLight.shadow.camera.far    = maxDim * 4;
            sunLight.shadow.camera.left   = sunLight.shadow.camera.bottom = -maxDim;
            sunLight.shadow.camera.right  = sunLight.shadow.camera.top    =  maxDim;
            sunLight.shadow.camera.updateProjectionMatrix();

            console.log('Modelo carregado! Tamanho:', size);
        },

        function (xhr) {
            if (xhr.total > 0) {
                const pct = Math.round((xhr.loaded / xhr.total) * 100);
                if (loadingMessage) loadingMessage.textContent = 'A carregar modelo: ' + pct + '%';
            }
        },

        function (error) {
            console.error('Erro ao carregar modelo 3D:', error);
            if (loadingMessage) {
                loadingMessage.textContent = 'Erro ao carregar modelo 3D';
                loadingMessage.style.color = 'red';
            }
        }
    );

    // 9️⃣ LOOP DE ANIMAÇÃO
    function animate() {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
    }
    animate();

    // 🔟 RESPONSIVE
    function onResize() {
        const w = container.clientWidth;
        const h = container.clientHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
    }
    window.addEventListener('resize', onResize);
    onResize();

    console.log('CONTROLOS: Esquerdo = Orbitar | Direito = Andar | Roda = Zoom');
});

// LOADER ANIMAÇÃO
(function () {
  'use strict';
  var loader = document.getElementById('esb-loader');
  var bar    = document.getElementById('esb-bar');
  var sub    = document.getElementById('esb-sub');
  var page   = document.getElementById('esb-page');
  var TOTAL  = 5600;

  function init() {
    requestAnimationFrame(function () {
      bar.classList.add('esb-run');
    });
    var letters = document.querySelectorAll('.esb-letter-inner');
    letters.forEach(function (el) {
      var delay = parseFloat(el.getAttribute('data-delay') || 0);
      var dir   = el.getAttribute('data-dir') || 'up';
      el.style.setProperty('--delay', delay + 's');
      el.style.setProperty('--dur',   '0.7s');
      el.classList.add(dir === 'up' ? 'esb-anim-up' : 'esb-anim-down');
    });
    setTimeout(function () {
      sub.classList.add('esb-vis');
    }, 1200);
    setTimeout(function () {
      loader.classList.add('esb-wipe');
      setTimeout(function () {
        loader.classList.add('esb-done');
        if (page) page.classList.add('esb-vis');
      }, 900);
    }, TOTAL);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();