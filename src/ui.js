import { GUI } from 'lil-gui'

export class UI {
    constructor() {
        this.gui = new GUI()
        this.selectionFolder = null
        this.selectionData = {
            name: '',
            position: { x: 0, y: 0, z: 0 },
            rotation: '0, 0, 0',
            scale: '1, 1, 1'
        }
        this.selectedObjectRef = null
        this.onSelectionChange = null
        this.positionControllers = null
        this.physicsController = null
        this.selectionNameController = null
    }

    addCameraControlsUI(params, onChange) {
        const folder = this.gui.addFolder('Camera Controls')

        folder
            .add(params, 'wasdMovement')
            .name('WASD Movement')
            .onChange((value) => {
                if (typeof onChange === 'function') {
                    onChange(value)
                }
            })

        folder.open()
    }

    addGameplayUI(physicsParams, towerParams, callbacks = {}) {
        const {
            onTogglePhysics,
            onResetTower,
            onAddBlock,
            onClearScene,
            onLayerCountChange,
        } = callbacks

        const folder = this.gui.addFolder('Jenga')

        this.physicsController = folder
            .add(physicsParams, 'enabled')
            .name('Enable Physics')
            .onChange((value) => {
                if (typeof onTogglePhysics === 'function') {
                    onTogglePhysics(value)
                }
            })

        folder
            .add(towerParams, 'layers', 6, 30, 1)
            .name('Layers')
            .onFinishChange((value) => {
                if (typeof onLayerCountChange === 'function') {
                    onLayerCountChange(value)
                }
            })

        folder
            .add({ resetTower: () => onResetTower && onResetTower() }, 'resetTower')
            .name('Reset Tower')

        folder
            .add({ addBlock: () => onAddBlock && onAddBlock() }, 'addBlock')
            .name('Add Block In Front')

        folder
            .add({ clearScene: () => onClearScene && onClearScene() }, 'clearScene')
            .name('Clear Scene')

        folder.open()
    }

    addSceneEditorUI(availableModels, onAddObject, onDeleteObject) {
        const folder = this.gui.addFolder('Scene Editor')
        
        const addObjectParams = {
            model: availableModels[0]
        }
        
        folder
            .add(addObjectParams, 'model', availableModels)
            .name('Model to Add')
        
        folder
            .add({ addObject: () => onAddObject(addObjectParams.model) }, 'addObject')
            .name('Add Object')
        
        folder
            .add({ deleteObject: () => onDeleteObject() }, 'deleteObject')
            .name('Delete Selected')
        
        folder.open()
    }

    addSkyboxUI(files, params, onChange) {
        const folder = this.gui.addFolder('Skybox')

        folder
            .add(params, 'file', files)
            .name('Texture')
            .onChange((value) => {
                if (typeof onChange === 'function') {
                    onChange(value)
                }
            })

        folder.open()
    }

    addGroundUI(files, params, onChange) {
        const folder = this.gui.addFolder('Ground')
        const notifyChange = () => {
            if (typeof onChange === 'function') {
                onChange(params)
            }
        }

        folder
            .add(params, 'texture', files)
            .name('Texture')
            .onChange(notifyChange)

        folder
            .add(params, 'repeats', 1, 1000, 1)
            .name('Repeats')
            .onChange(notifyChange)

        folder.open()
    }

    addSunUI(params, onChange) {
        const folder = this.gui.addFolder('Sun')
        const notifyChange = () => {
            if (typeof onChange === 'function') {
                onChange(params)
            }
        }

        folder
            .add(params, 'intensity', 0, 10, 0.1)
            .name('Intensity')
            .onChange(notifyChange)

        folder
            .add(params, 'radiusX', 0, 500, 1)
            .name('Orbit Radius X')
            .onChange(notifyChange)

        folder
            .add(params, 'radiusZ', 0, 500, 1)
            .name('Orbit Radius Z')
            .onChange(notifyChange)

        folder
            .add(params, 'height', -50, 200, 1)
            .name('Height')
            .onChange(notifyChange)

        folder
            .add(params, 'speed', -5, 5, 0.01)
            .name('Orbit Speed')
            .onChange(notifyChange)

        folder
            .addColor(params, 'color')
            .name('Color')
            .onChange(notifyChange)

        folder.open()
    }

    addSceneControlsUI(onExport, onImport, onClear) {
        const folder = this.gui.addFolder('Scene Controls')
        
        folder
            .add({ exportScene: () => onExport() }, 'exportScene')
            .name('Export Scene')
        
        folder
            .add({ clearScene: () => onClear() }, 'clearScene')
            .name('Clear Scene')
        
        folder
            .add({ importScene: () => onImport() }, 'importScene')
            .name('Import Scene')
        
        folder.open()
    }

    addSelectionInfoUI(onChange) {
        this.onSelectionChange = onChange
        this.selectionFolder = this.gui.addFolder('Selected Object')
        
        this.selectionNameController = this.selectionFolder
            .add(this.selectionData, 'name')
            .name('Name')
            .onChange((value) => {
                if (this.selectedObjectRef) {
                    this.selectedObjectRef.name = value
                }
            })
        
        const updatePosition = () => {
            if (!this.selectedObjectRef) {
                return
            }

            const { x, y, z } = this.selectionData.position
            this.selectedObjectRef.position.set(x, y, z)
        }

        this.positionControllers = {
            x: this.selectionFolder
                .add(this.selectionData.position, 'x')
                .name('Position X')
                .onChange(updatePosition),
            y: this.selectionFolder
                .add(this.selectionData.position, 'y')
                .name('Position Y')
                .onChange(updatePosition),
            z: this.selectionFolder
                .add(this.selectionData.position, 'z')
                .name('Position Z')
                .onChange(updatePosition),
        }
        
        this.selectionFolder
            .add(this.selectionData, 'rotation')
            .name('Rotation (x, y, z)')
            .onChange((value) => {
                if (this.selectedObjectRef) {
                    const values = value.split(',').map(v => parseFloat(v.trim()))
                    if (values.length === 3 && values.every(v => !isNaN(v))) {
                        this.selectedObjectRef.rotation.set(values[0], values[1], values[2])
                    }
                }
            })
        
        this.selectionFolder
            .add(this.selectionData, 'scale')
            .name('Scale (x, y, z)')
            .onChange((value) => {
                if (this.selectedObjectRef) {
                    const values = value.split(',').map(v => parseFloat(v.trim()))
                    if (values.length === 3 && values.every(v => !isNaN(v))) {
                        this.selectedObjectRef.scale.set(values[0], values[1], values[2])
                    }
                }
            })
        
        this.selectionFolder.hide()
    }

    updateSelectionInfo(object) {
        if (!this.selectionFolder) {
            return
        }

        if (object) {
            this.selectedObjectRef = object
            
            this.selectionData.name = object.name || 'Unnamed'
            
            const pos = object.position
            this.selectionData.position.x = parseFloat(pos.x.toFixed(2))
            this.selectionData.position.y = parseFloat(pos.y.toFixed(2))
            this.selectionData.position.z = parseFloat(pos.z.toFixed(2))
            
            const rot = object.rotation
            this.selectionData.rotation = `${rot.x.toFixed(2)}, ${rot.y.toFixed(2)}, ${rot.z.toFixed(2)}`
            
            const scale = object.scale
            this.selectionData.scale = `${scale.x.toFixed(2)}, ${scale.y.toFixed(2)}, ${scale.z.toFixed(2)}`
            
            if (this.positionControllers) {
                Object.values(this.positionControllers).forEach((controller) => {
                    controller.updateDisplay()
                })
            }

            if (this.selectionNameController) {
                this.selectionNameController.updateDisplay()
            }

            this.selectionFolder.show()
        } else {
            this.selectionFolder.hide()
        }
    }

    updatePhysicsToggle(enabled) {
        if (!this.physicsController) {
            return
        }

        if (typeof enabled === 'boolean') {
            this.physicsController.object.enabled = enabled
        }

        this.physicsController.updateDisplay()
    }
}