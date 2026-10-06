// Conecta la página del juego con Windows: guardar el informe PDF y la copia de seguridad de los alumnos.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('escritorio', {
  guardarPDF: (nombre, datos) => ipcRenderer.invoke('guardar-pdf', nombre, datos),
  leerDatos: () => ipcRenderer.invoke('leer-datos'),
  guardarDatos: texto => ipcRenderer.send('guardar-datos', texto)
});
