## Jenga Builder

Build, arrange, and topple a tower of Jenga blocks in the browser using Three.js and Cannon‑ES.  
This project repurposes the original forest scene template into a focused physics playground tailored for Jenga experiments.

**Live:** https://jenga.axel-lapierre.dev

### Features
- Pre-built tower of alternating Jenga layers on load.
- Edit mode with selection highlighting and `G`-draggable block positioning.
- Toggleable physics simulation so the tower stays frozen until you're ready.
- Add or reset blocks through the on-screen lil-gui controls.
- Configurable skybox, ground textures, sun animation, and camera behaviour.

### Getting Started
1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the development server:
   ```bash
   npm run dev
   ```
3. Open the listed `localhost` URL in a modern browser with WebGL support.

### Controls
- **Orbit camera**: drag with left mouse, scroll to zoom.
- **Toggle pointer-lock WASD camera**: use the GUI `Camera Controls` folder.
- **Select block**: left-click a mesh; properties appear in the `Selected Object` GUI folder.
- **Move block**: press `G`, then move the mouse over the table; press `G` again to lock placement.
- **Delete block**: press `Delete`/`Backspace` while a selection is active.
- **Enable physics**: toggle `Enable Physics` from the `Jenga` GUI folder.
- **Reset tower**: click `Reset Tower` in the `Jenga` GUI folder.
- **Add new block**: `Add Block In Front` spawns a block 10 units ahead of the camera for manual placement.

### Project Structure
- `src/application.js` – bootstraps the renderer, camera, UI, and render loop.
- `src/scene.js` – scene graph, asset management, and Cannon‑ES physics integration with Jenga helpers.
- `src/ui.js` – lil-gui orchestration for camera, sun, ground, skybox, and gameplay controls.
- `public/models/jenga.glb` – GLB model used for cloning Jenga blocks.

### Customising the Tower
Use the `Layers` slider under the `Jenga` folder to rebuild the tower at a different height.  
When physics are disabled you can reposition blocks freely to design custom layouts before letting gravity take over.

### Development Notes
- The project uses `THREE.WebGLRenderer` for broader browser support.
- Physics contact materials are tuned for Jenga-style friction and damping; tweak them in `src/scene.js` if you need different behaviour.
- Shader, asset, or interaction experiments can extend `Scene.buildJengaTower` or `Application.addObjectToScene`.