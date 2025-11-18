import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

export class Camera {
    
    constructor(renderer) {
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        )
        
        this.defaultPosition()
        
        this.controls = new OrbitControls(this.camera, renderer.domElement)
        this.controls.enableDamping = true
        this.controls.dampingFactor = 0.05
        
        this.wasdMovement = false
        this.moveSpeed = 15
        this.keys = {
            z: false,
            q: false,
            s: false,
            d: false,
            shift: false
        }
        
        this.yaw = 0
        this.pitch = 0
        this.sensitivity = 0.002
        this.isPointerLocked = false
        this.renderer = renderer
        
        this.setupKeyListeners()
        this.setupMouseListeners()
    }

    defaultPosition() {
        this.camera.position.set(0, 5, 10)
        this.camera.lookAt(0, 0, 0)
        
        const euler = new THREE.Euler().setFromQuaternion(this.camera.quaternion, 'YXZ')
        this.yaw = euler.y
        this.pitch = euler.x
    }

    setupKeyListeners() {
        window.addEventListener('keydown', (event) => {
            if (event.key === 'z' || event.key === 'Z') this.keys.z = true
            if (event.key === 'q' || event.key === 'Q') this.keys.q = true
            if (event.key === 's' || event.key === 'S') this.keys.s = true
            if (event.key === 'd' || event.key === 'D') this.keys.d = true
            if (event.shiftKey) this.keys.shift = true
        })

        window.addEventListener('keyup', (event) => {
            if (event.key === 'z' || event.key === 'Z') this.keys.z = false
            if (event.key === 'q' || event.key === 'Q') this.keys.q = false
            if (event.key === 's' || event.key === 'S') this.keys.s = false
            if (event.key === 'd' || event.key === 'D') this.keys.d = false
            if (!event.shiftKey) this.keys.shift = false
        })
    }

    setupMouseListeners() {
        this.renderer.domElement.addEventListener('click', () => {
            if (this.wasdMovement && !this.isPointerLocked) {
                this.renderer.domElement.requestPointerLock()
            }
        })

        document.addEventListener('pointerlockchange', () => {
            this.isPointerLocked = document.pointerLockElement === this.renderer.domElement
        })

        document.addEventListener('mousemove', (event) => {
            if (this.wasdMovement && this.isPointerLocked) {
                const movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0
                const movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0

                this.yaw -= movementX * this.sensitivity
                this.pitch -= movementY * this.sensitivity

                const maxPitch = Math.PI / 2 - 0.1
                this.pitch = Math.max(-maxPitch, Math.min(maxPitch, this.pitch))

                this.updateCameraRotation()
            }
        })
    }

    updateCameraRotation() {
        const euler = new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ')
        this.camera.quaternion.setFromEuler(euler)
    }

    setWASDMovement(enabled) {
        this.wasdMovement = enabled
        if (enabled) {
            this.controls.enableRotate = false
            this.controls.enablePan = false
            this.controls.enableZoom = false
            
            const euler = new THREE.Euler().setFromQuaternion(this.camera.quaternion, 'YXZ')
            this.yaw = euler.y
            this.pitch = euler.x
            
            if (!this.isPointerLocked) {
                this.renderer.domElement.requestPointerLock()
            }
        } else {
            this.controls.enableRotate = true
            this.controls.enablePan = true
            this.controls.enableZoom = true
            
            if (this.isPointerLocked) {
                document.exitPointerLock()
            }
        }
    }

    update(deltaTime = 0) {
        if (!this.wasdMovement) {
            this.controls.update()
        } else {
            const speed = this.keys.shift ? this.moveSpeed * 4 : this.moveSpeed
            const moveDistance = speed * (deltaTime || 0.016)
            
            const direction = new THREE.Vector3()
            const forward = new THREE.Vector3(0, 0, -1)
            const right = new THREE.Vector3(1, 0, 0)
            
            forward.applyQuaternion(this.camera.quaternion)
            right.applyQuaternion(this.camera.quaternion)
            
            forward.normalize()
            right.normalize()
            
            if (this.keys.z) direction.add(forward)
            if (this.keys.s) direction.sub(forward)
            if (this.keys.q) direction.sub(right)
            if (this.keys.d) direction.add(right)
            
            direction.normalize()
            direction.multiplyScalar(moveDistance)
            
            this.camera.position.add(direction)
        }
    }

    onResize(width, height) {
        this.camera.aspect = width / height
        this.camera.updateProjectionMatrix()
    }
}