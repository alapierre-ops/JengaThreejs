import * as THREE from 'three'
import { createStandardMaterial, loadGltf, textureloader } from './tools.js'
import * as CANNON from 'cannon-es'

export class Scene {
    constructor() {
        this.scene = new THREE.Scene()
        this.loadedModels = new Map()
        this.loadedSkyboxes = new Map()
        this.currentSceneParams = {}
        this.ground = null
        this.directionalLight = null
        this.directionalLightHelper = null

        this.physicsWorld = new CANNON.World({
            gravity: new CANNON.Vec3(0, -9.82, 0),
        })
        this.physicsWorld.broadphase = new CANNON.SAPBroadphase(this.physicsWorld)
        this.physicsWorld.allowSleep = true
        this.physicsWorld.defaultContactMaterial.friction = 0.4
        this.physicsWorld.defaultContactMaterial.restitution = 0.05

        this.materials = {
            default: new CANNON.Material('default'),
            ground: new CANNON.Material('ground'),
            jenga: new CANNON.Material('jengaBlock'),
        }

        this.physicsWorld.addContactMaterial(
            new CANNON.ContactMaterial(this.materials.jenga, this.materials.jenga, {
                friction: 0.45,
                restitution: 0.05,
            }),
        )

        this.physicsWorld.addContactMaterial(
            new CANNON.ContactMaterial(this.materials.jenga, this.materials.ground, {
                friction: 0.6,
                restitution: 0.01,
            }),
        )

        this.physicsObjects = []
        this.jengaBlocks = []
        this.cachedJengaDimensions = null
    }

    addAmbientLight() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.1)
        this.scene.add(ambientLight)
    }

    addDirectionalLight() {
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5)
        directionalLight.position.set(10, 20, 10)
        directionalLight.castShadow = true
        directionalLight.shadow.mapSize.width = 2048
        directionalLight.shadow.mapSize.height = 2048

        directionalLight.shadow.camera.left = -100
        directionalLight.shadow.camera.right = 100
        directionalLight.shadow.camera.top = 100
        directionalLight.shadow.camera.bottom = -100
        directionalLight.shadow.camera.near = 0.1
        directionalLight.shadow.camera.far = 1000
        this.scene.add(directionalLight.target)
        this.scene.add(directionalLight)

        const helper = new THREE.DirectionalLightHelper(directionalLight, 5)
        this.scene.add(helper)

        this.directionalLight = directionalLight
        this.directionalLightHelper = helper

        return directionalLight
    }

    async addSkybox(filename) {
        if (!filename) {
            return null
        }

        let skyboxTexture = this.loadedSkyboxes.get(filename)
        if (!skyboxTexture) {
            skyboxTexture = await textureloader.loadAsync(`skybox/${filename}`)
            skyboxTexture.mapping = THREE.EquirectangularReflectionMapping
            skyboxTexture.colorSpace = THREE.SRGBColorSpace
            this.loadedSkyboxes.set(filename, skyboxTexture)
        }

        this.scene.background = skyboxTexture
        this.scene.environment = skyboxTexture

        return skyboxTexture
    }

    async loadScene(url) {
        const response = await fetch(url)
        if (!response.ok) {
            throw new Error(`Impossible de charger la scène: ${url}`)
        }

        const sceneData = await response.json()
        this.currentSceneParams = sceneData.params ?? {}

        const nodes = sceneData.nodes ?? []

        for (const node of nodes) {
            if (!node?.name) {
                continue
            }

            await this.addObject(
                node.name,
                node.position ?? null,
                node.rotation ?? null,
                node.scale ?? null,
                { physics: { material: this.materials.default } },
            )
        }

        return sceneData
    }

    async addObject(modelName, position = null, rotation = null, scale = null, options = {}) {
        if (!modelName) {
            return null
        }

        const baseModel = await this.ensureModelLoaded(modelName)

        const instance = baseModel.clone(true)
        instance.name = modelName

        if (position) {
            instance.position.fromArray(
                typeof position === 'string' ? position.split(',').map(Number) : position,
            )
        } else {
            instance.position.set(0, 0, 0)
        }

        if (rotation) {
            instance.quaternion.fromArray(
                typeof rotation === 'string' ? rotation.split(',').map(Number) : rotation,
            )
        }

        if (scale) {
            instance.scale.fromArray(
                typeof scale === 'string' ? scale.split(',').map(Number) : scale,
            )
        }

        instance.traverse((o) => {
            if (o.isMesh) {
                o.castShadow = true
                o.receiveShadow = true
                o.userData = {
                    ...(o.userData ?? {}),
                    isSelectable: true,
                    object: instance,
                }
            }
        })

        const bounds = new THREE.Box3().setFromObject(instance)
        const size = bounds.getSize(new THREE.Vector3())

        const halfExtents = new CANNON.Vec3(
            Math.max(size.x / 2, 0.05),
            Math.max(size.y / 2, 0.05),
            Math.max(size.z / 2, 0.05),
        )

        const { physics = {} } = options
        const mass = typeof physics.mass === 'number' ? physics.mass : 1
        const material = physics.material ?? this.materials.default

        const body = new CANNON.Body({
            mass,
            material,
            shape: new CANNON.Box(halfExtents),
        })

        body.allowSleep = physics.allowSleep ?? true
        body.linearDamping = physics.linearDamping ?? 0.01
        body.angularDamping = physics.angularDamping ?? 0.01
        body.sleepSpeedLimit = physics.sleepSpeedLimit ?? 0.1
        body.sleepTimeLimit = physics.sleepTimeLimit ?? 1

        body.position.copy(instance.position)
        body.quaternion.copy(instance.quaternion)

        this.physicsWorld.addBody(body)
        this.physicsObjects.push({ mesh: instance, body })
        instance.userData.physicsBody = body
        instance.userData.isJengaBlock = modelName === 'jenga'

        if (instance.userData.isJengaBlock) {
            this.jengaBlocks.push(instance)
            body.material = this.materials.jenga
            body.linearDamping = physics.linearDamping ?? 0.05
            body.angularDamping = physics.angularDamping ?? 0.1
        }

        this.scene.add(instance)
        return instance
    }

    removeObject(object) {
        if (!object) {
            return false
        }

        const entryIndex = this.physicsObjects.findIndex(({ mesh }) => mesh === object)
        if (entryIndex !== -1) {
            const { body } = this.physicsObjects[entryIndex]
            this.physicsWorld.removeBody(body)
            this.physicsObjects.splice(entryIndex, 1)
        }

        const jengaIndex = this.jengaBlocks.indexOf(object)
        if (jengaIndex !== -1) {
            this.jengaBlocks.splice(jengaIndex, 1)
        }

        const physicsBody = object.userData?.physicsBody
        if (physicsBody) {
            this.physicsWorld.removeBody(physicsBody)
            delete object.userData.physicsBody
        }

        this.scene.remove(object)

        object.traverse((child) => {
            if (child.geometry) child.geometry.dispose()
            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach((mat) => mat.dispose())
                } else {
                    child.material.dispose()
                }
            }
        })

        return true
    }

    duplicateObject(object) {
        if (!object) {
            return null
        }

        const position = object.position.clone().add(new THREE.Vector3(1, 0, 0))
        const rotation = object.quaternion
        const scale = object.scale

        return this.addObject(
            object.name,
            [position.x, position.y, position.z],
            [rotation.x, rotation.y, rotation.z, rotation.w],
            [scale.x, scale.y, scale.z],
            { physics: { material: this.materials.default } },
        )
    }

    clearScene() {
        const meshes = this.physicsObjects.map(({ mesh }) => mesh)
        this.physicsObjects.length = 0
        meshes.forEach((mesh) => this.removeObject(mesh))

        const removable = new Set()
        this.scene.traverse((object) => {
            if (object.userData?.isSelectable) {
                removable.add(object.userData?.object || object)
            }
        })

        removable.forEach((obj) => {
            if (this.scene.children.includes(obj)) {
                this.removeObject(obj)
            }
        })

        this.jengaBlocks = []
    }

    async importScene(event, params) {
        const file = event.target.files[0]
        if (!file) {
            return
        }

        this.clearScene()

        const text = await file.text()
        const sceneData = JSON.parse(text)

        this.currentSceneParams = sceneData.params ?? {}

        const nodes = sceneData.nodes ?? []

        for (const node of nodes) {
            if (!node?.name) {
                continue
            }

            const baseModel = await this.ensureModelLoaded(node.name)
            const instance = baseModel.clone(true)
            instance.name = node.name

            if (node.position) {
                instance.position.fromArray(
                    typeof node.position === 'string' ? node.position.split(',').map(Number) : node.position,
                )
            }

            if (node.rotation) {
                instance.quaternion.fromArray(
                    typeof node.rotation === 'string' ? node.rotation.split(',').map(Number) : node.rotation,
                )
            }

            if (node.scale) {
                instance.scale.fromArray(
                    typeof node.scale === 'string' ? node.scale.split(',').map(Number) : node.scale,
                )
            }

            instance.traverse((o) => {
                if (o.isMesh) {
                    o.castShadow = true
                    o.receiveShadow = true
                    o.userData = {
                        ...(o.userData ?? {}),
                        isSelectable: true,
                        object: instance,
                    }
                }
            })

            this.scene.add(instance)
        }

        if (params) {
            if (params.skybox?.file) {
                await this.addSkybox(params.skybox.file)
            }
            if (params.ground?.texture && params.ground?.repeats) {
                this.changeGround(params.ground.texture, params.ground.repeats)
            }
        }

        return sceneData
    }

    addCube() {
        const geometry = new THREE.BoxGeometry(1, 1, 1)
        const material = new THREE.MeshStandardMaterial({ color: 0xff0000 })
        const cube = new THREE.Mesh(geometry, material)

        cube.position.y = 1

        this.scene.add(cube)

        return cube
    }

    addGround(texture, repeats) {
        if (!this.ground) {
            const geometry = new THREE.PlaneGeometry(5000, 5000)
            this.ground = new THREE.Mesh(geometry)

            this.ground.rotation.x = -Math.PI / 2
            this.ground.position.y = 0
            this.ground.receiveShadow = true

            const groundShape = new CANNON.Box(new CANNON.Vec3(2500, 0.01, 2500))
            const groundBody = new CANNON.Body({
                mass: 0,
                material: this.materials.ground,
                shape: groundShape,
            })
            groundBody.position.copy(this.ground.position)
            groundBody.type = CANNON.Body.STATIC
            this.physicsWorld.addBody(groundBody)
            this.ground.userData.physicsBody = groundBody

            this.scene.add(this.ground)
        }

        return this.changeGround(texture, repeats)
    }

    changeGround(texture, repeats) {
        if (!this.ground) {
            console.warn('Ground not initialised, calling addGround first.')
            return null
        }

        if (this.ground.material) {
            this.ground.material.dispose()
        }

        const material = createStandardMaterial(texture, repeats)
        this.ground.material = material
        this.ground.material.needsUpdate = true

        return this.ground
    }

    updateSun(params) {
        if (!this.directionalLight) {
            console.warn('Directional light not initialised, call addDirectionalLight first.')
            return null
        }

        if (typeof params.intensity === 'number') {
            this.directionalLight.intensity = params.intensity
        }

        if (typeof params.color !== 'undefined' && params.color !== null) {
            this.directionalLight.color.set(params.color)
            if (this.directionalLightHelper?.material?.color) {
                this.directionalLightHelper.material.color.set(params.color)
            }
        }

        const currentPosition = this.directionalLight.position.clone()
        if (typeof params.x === 'number') {
            currentPosition.x = params.x
        }
        if (typeof params.y === 'number') {
            currentPosition.y = params.y
        }
        if (typeof params.z === 'number') {
            currentPosition.z = params.z
        }

        this.directionalLight.position.copy(currentPosition)
        this.directionalLight.target.position.set(0, 0, 0)

        if (this.directionalLightHelper) {
            this.directionalLightHelper.update()
        }

        return this.directionalLight
    }

    async ensureModelLoaded(modelName) {
        let baseModel = this.loadedModels.get(modelName)
        if (!baseModel) {
            baseModel = await loadGltf(modelName)
            this.loadedModels.set(modelName, baseModel)
        }
        return baseModel
    }

    async getModelDimensions(modelName) {
        const baseModel = await this.ensureModelLoaded(modelName)
        const bounds = new THREE.Box3().setFromObject(baseModel)
        const size = bounds.getSize(new THREE.Vector3())
        return { size, bounds }
    }

    async getJengaDimensions() {
        if (this.cachedJengaDimensions) {
            return this.cachedJengaDimensions
        }

        const { size } = await this.getModelDimensions('jenga')
        const ordered = [
            { axis: 'x', value: size.x },
            { axis: 'y', value: size.y },
            { axis: 'z', value: size.z },
        ].sort((a, b) => b.value - a.value)

        const length = ordered[0]?.value ?? size.x
        const width = ordered[1]?.value ?? size.z
        const height = ordered[2]?.value ?? size.y

        this.cachedJengaDimensions = { length, width, height }
        return this.cachedJengaDimensions
    }

    async buildJengaTower({
        layers = 18,
        basePosition = new THREE.Vector3(0, 0, 0),
        gapRatio = 0.12,
    } = {}) {
        await this.clearJengaTower()

        const { width, height } = await this.getJengaDimensions()
        const layerGap = height * 0.02
        const blockSpacing = width * (1 + gapRatio)
        const startY = basePosition.y + height / 2
        const rotationY90 = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI / 2, 0))
        const blockMass = 0.6

        const tasks = []

        for (let layer = 0; layer < layers; layer += 1) {
            const isEvenLayer = layer % 2 === 0
            const y = startY + layer * (height + layerGap)

            for (let i = -1; i <= 1; i += 1) {
                const offset = i * blockSpacing
                const position = new THREE.Vector3(basePosition.x, y, basePosition.z)

                let rotationArray = [0, 0, 0, 1]

                if (isEvenLayer) {
                    position.z += offset
                } else {
                    position.x += offset
                    rotationArray = [rotationY90.x, rotationY90.y, rotationY90.z, rotationY90.w]
                }

                tasks.push(
                    this.addObject(
                        'jenga',
                        [position.x, position.y, position.z],
                        rotationArray,
                        null,
                        {
                            physics: {
                                mass: blockMass,
                                material: this.materials.jenga,
                                linearDamping: 0.05,
                                angularDamping: 0.1,
                                allowSleep: true,
                                sleepSpeedLimit: 0.05,
                                sleepTimeLimit: 0.5,
                            },
                        },
                    ),
                )
            }
        }

        const blocks = await Promise.all(tasks)
        return blocks.filter(Boolean)
    }

    async resetJengaTower(options) {
        return this.buildJengaTower(options)
    }

    async clearJengaTower() {
        const blocks = [...this.jengaBlocks]
        blocks.forEach((block) => this.removeObject(block))
        this.jengaBlocks = []
    }

    setPhysicsEnabled(enabled) {
        this.physicsObjects.forEach(({ body }) => {
            if (body.type === CANNON.Body.STATIC) {
                return
            }

            if (enabled) {
                body.wakeUp()
            } else {
                body.velocity.set(0, 0, 0)
                body.angularVelocity.set(0, 0, 0)
                body.force.set(0, 0, 0)
                body.torque.set(0, 0, 0)
                body.sleep()
            }
        })
    }
}