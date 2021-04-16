/**
 * Application entry file.
 *
 * We create a drag and drop area and a file picker that are used to load PDFs.
 * Once a PDF is dropped or selected we read it from disk as an ArrayBuffer
 * which we can then pass to PSPDFKit.load() to initialize the viewer with the given PDF.
 *
 * We also add an `Export PDF` button to the main toolbar and monitor changes to
 * inform the users when they are about to leave the page or open a new document
 * and there is unsaved(exported) work.
 */

import PSPDFKit from "pspdfkit";

import makeToolbarItems from "./lib/toolbar-items";
import { processFiles } from "./lib/utils";
import dragDrop from "drag-drop";

let currentInstance = null;
let hasUnsavedAnnotations = false;
let isAlreadyLoaded = false;

/**
 * Creates an onAnnotationsChange handler that
 * keeps track of changes.
 *
 * We skip the first call since `annotations.change` fires
 * when the PDF viewer is initialized and populated with annotations.
 */
const createOnAnnotationsChange = () => {
  let initialized = false;
  console.log("annotations has changed.");
  return () => {
    if (initialized) {
      hasUnsavedAnnotations = true;
    } else {
      initialized = true;
    }
  };
};

/**
 * Main load function invoked when a dropped or selected file (PDF)
 * has been successfully read as ArrayBuffer.
 *
 * If there is an existing running instance of PSPDFKit it is destroyed
 * before a creating a new one.
 */
function load(pdfArrayBuffers) {
  const pdfArrayBuffer = pdfArrayBuffers[0];

  if (isAlreadyLoaded) {
    console.info("Destroyed previous instance");
    PSPDFKit.unload(".App");
    hasUnsavedAnnotations = false;
  }

  isAlreadyLoaded = true;

  const toolbarItems = makeToolbarItems(
    function getInstance() {
      return currentInstance;
    },

    function callback() {
      hasUnsavedAnnotations = false;
    }
  );

  const configuration = {
    container: ".App",
    document: pdfArrayBuffer,
    toolbarItems,
    licenseKey: process.env.PSPDFKIT_LICENSE_KEY
  };

  PSPDFKit.load(configuration)
    .then(instance => {
      currentInstance = instance;
      // instance.addEventListener(
      //   "annotations.change",
      //   createOnAnnotationsChange()
      // );
      instance.addEventListener("annotations.load", loadedAnnotations => {
        console.log(loadedAnnotations);
      });
      instance.addEventListener("annotations.willChange", event => {
        if (event.reason === PSPDFKit.AnnotationsWillChangeReason.DRAW_START) {
          console.log("The user is drawing...");
        }
      });
      instance.addEventListener("annotations.change", () => {
        console.log("Something in the annotations has changed.");
      });
      instance.addEventListener("annotations.create", createdAnnotations => {
        console.log(createdAnnotations);
      });
      instance.addEventListener("annotations.update", updatedAnnotations => {
        console.log(updatedAnnotations);
      });
      instance.addEventListener("annotations.delete", deletedAnnotations => {
        console.log(deletedAnnotations);
      });
    })
    .catch(console.error);
}

function loadxfdf(xfdf) {
  currentInstance.applyOperations([
    {
      type: "applyXfdf",
      xfdf: xfdf,
    }
  ]);
}

/**
 * The code present below is not required to make PSPDFKit work. They just provide the file picking
 * and drag n drop functionality.
 */

function onFail({ message }) {
  alert(message);
}

function shouldPreventLoad() {
  return (
    hasUnsavedAnnotations &&
    !window.confirm(
      "You have unsaved changes. By continuing, you will lose those changes."
    )
  );
}

/**
 * This code handles drag and drop behaviour. Once you have selected a PDF, the drag and
 * drop instance is destroyed. This means this only works for the first PDF. If you
 * want to load more PDFs, please use file picker.
 */
let destroyListener = dragDrop("#body", {
  onDrop: files => {
    if (shouldPreventLoad()) {
      return;
    }

    processFiles(files)
      .then(arrayBuffers => {
        destroyDragAndDrop();
        load(arrayBuffers);
      })
      .catch(onFail);
  }
});

function destroyDragAndDrop() {
  if (destroyListener) {
    destroyListener();
    document.querySelector(".drag-text").classList.add("is-hidden");
    destroyListener = null;
  }
}

/**
 * The code below handles the file picket via the systems's default File Picker.
 */
function onFileSelectSuccess(pdfArrayBuffers) {
  destroyDragAndDrop();
  load(pdfArrayBuffers);
}

// document.querySelector("#selectFile").addEventListener("change", event => {
//   if (!event.target.files.length || shouldPreventLoad()) {
//     event.target.value = null;
//     return;
//   }

//   // processFiles([...event.target.files])
//   //   .then(onFileSelectSuccess)
//   //   .catch(onFail);

//   event.target.value = null;
// });

document.querySelector('button').addEventListener("click", event => {
  applyxfdf();
});

function applyxfdf() {
  loadxfdf("<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"no\"?><xfdf xmlns=\"http://ns.adobe.com/xfdf/\" xml:space=\"preserve\"><annots><freetext creationdate=\"D:20210127192408Z\" date=\"D:20210127192804Z\" flags=\"print\" name=\"01EX2MV56HP12CNW69B94BS4RM\" page=\"0\" rect=\"833.846436,1159.355225,1543.129028,1222.472168\" width=\"0.000000\"><contents>This is the correct size 11' 10\"</contents> <contents-richtext><body xmlns=\"http://www.w3.org/1999/xhtml\" xmlns:xfa=\"http://www.xfa.org/schema/xfa-data/1.0/\" xfa:APIVersion=\"Acrobat:11.0.12\" xfa:spec=\"2.0.2\"><p>This is the correct size 11' 10\"</p></body></contents-richtext> <defaultappearance>/Helvetica_0 18 Tf 0 0 0 rg </defaultappearance> <defaultstyle>font:18.00pt \"Helvetica\"; color:#000000; </defaultstyle> </freetext></annots></xfdf>");
}