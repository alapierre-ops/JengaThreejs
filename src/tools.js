import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

export const textureloader = new THREE.TextureLoader()

const gltfLoader = new GLTFLoader()
gltfLoader.setPath('/models/')

export class ColorGUIHelper {
  constructor(object, prop) {
    this.object = object
    this.prop = prop
  }
  get value() {
    return `#${this.object[this.prop].getHexString()}`
  }
  set value(hexString) {
    this.object[this.prop].set(hexString)
  }
}

export const loadGltf = function (filename) {
    return new Promise((resolve, reject) => {
        gltfLoader.load(
            `${filename}.glb`,
            (gltf) => {
                const mesh = gltf.scene
                mesh.name = filename
                mesh.traverse((o) => {
                    if (o.isMesh) {
                        o.castShadow = true
                        o.receiveShadow = true
                    }
                })
                resolve(mesh)
            },
            undefined,
            (error) => {
                console.error(`Error loading ${filename}:`, error)
                reject(error)
            }
        )
    })
}


export const createStandardMaterial = function (texture, repeats) {

  const floorTexture = textureloader.load(`textures/${texture}_diff_1k.jpg`)
    floorTexture.wrapS = THREE.RepeatWrapping
    floorTexture.wrapT = THREE.RepeatWrapping
    floorTexture.repeat.set(repeats, repeats)
    floorTexture.magFilter = THREE.NearestFilter
    floorTexture.colorSpace = THREE.SRGBColorSpace

    const floorTextureNormal = textureloader.load(`textures/${texture}_nor_gl_1k.jpg`)
    floorTextureNormal.wrapS = THREE.RepeatWrapping
    floorTextureNormal.wrapT = THREE.RepeatWrapping
    floorTextureNormal.repeat.set(repeats, repeats)
    floorTextureNormal.magFilter = THREE.NearestFilter
    floorTextureNormal.colorSpace = THREE.SRGBColorSpace

    const floorTextureARM = textureloader.load(`textures/${texture}_arm_1k.jpg`)
    floorTextureARM.wrapS = THREE.RepeatWrapping
    floorTextureARM.wrapT = THREE.RepeatWrapping
    floorTextureARM.repeat.set(repeats, repeats)
    floorTextureARM.magFilter = THREE.NearestFilter
    floorTextureARM.colorSpace = THREE.LinearSRGBColorSpace

    return new THREE.MeshStandardMaterial ({
        map: floorTexture,
        normalMap: floorTextureNormal,
        aoMap: floorTextureARM,          // R
        roughnessMap: floorTextureARM,   // G
        metalnessMap: floorTextureARM,   // B
        roughness: 1.0,       
        metalness: 1.0,      
    })

}