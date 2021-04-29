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
async function load(pdfArrayBuffers) {
  const pdfArrayBuffer = pdfArrayBuffers[0];
  const pdfArrayBuffer2 = pdfArrayBuffer.slice(0);

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

  // PSPDFKit.load(configuration)
  //   .then(instance => {
  //     currentInstance = instance;
  //     instance.addEventListener("annotations.load", loadedAnnotations => {
  //       console.log(loadedAnnotations);
  //     });
  //     instance.addEventListener("annotations.willChange", event => {
  //       if (event.reason === PSPDFKit.AnnotationsWillChangeReason.DRAW_START) {
  //         console.log("The user is drawing...");
  //       }
  //     });
  //     instance.addEventListener("annotations.change", () => {
  //       console.log("Something in the annotations has changed.");
  //     });
  //     instance.addEventListener("annotations.create", createdAnnotations => {
  //       console.log(createdAnnotations);
  //     });
  //     instance.addEventListener("annotations.update", updatedAnnotations => {
  //       console.log(updatedAnnotations);
  //     });
  //     instance.addEventListener("annotations.delete", deletedAnnotations => {
  //       console.log(deletedAnnotations);
  //     });
  //   })
  //   .catch(console.error);

    const mainInstance = await PSPDFKit.load(configuration);
    
    const instance = await PSPDFKit.load({
      container: ".App",
      document: pdfArrayBuffer2,
      toolbarItems,
      licenseKey: process.env.PSPDFKIT_LICENSE_KEY,
      headless: true,
    });

    const xfdf = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>" +
    "<xfdf xml:space=\"preserve\" xmlns=\"http://ns.adobe.com/xfdf/\"><annots>"+
     "<square color=\"#2492FB\" creationdate=\"D:20210122154709Z\" date=\"D:20210122155220Z\" flags=\"print\" fringe=\"8.500000,8.500000,8.500000,8.500000\" intensity=\"2.000000\" name=\"0077B51B-ACB4-47C6-8157-4922D37B7A31\" page=\"0\" rect=\"1943.596191,486.198792,2125.547119,668.149841\" style=\"cloudy\" title=\"Ken Wiafe\" width=\"5.000000\"/><square color=\"#2293FB\" creationdate=\"D:20210122154509Z\" date=\"D:20210122155220Z\" flags=\"print\" fringe=\"11.000000,11.000000,11.000000,11.000000\" intensity=\"2.000000\" name=\"01EWNCAKGG4NXAZTJ1VG8B0HXK\" page=\"0\" rect=\"1974.995972,1322.202881,2128.813721,1427.465820\" style=\"cloudy\" width=\"5.000000\"/><square color=\"#2293FB\" creationdate=\"D:20210122154950Z\" date=\"D:20210122155220Z\" flags=\"print\" fringe=\"11.000000,11.000000,11.000000,11.000000\" intensity=\"2.000000\" name=\"01EWNCK5T0HQENAK633ACC5SFM\" page=\"0\" rect=\"1221.106079,1074.961914,1357.585571,1178.865967\" style=\"cloudy\" width=\"5.000000\"/><square color=\"#2293FB\" creationdate=\"D:20210122155242Z\" date=\"D:20210326181314Z\" flags=\"print\" fringe=\"11.000000,11.000000,11.000000,11.000000\" intensity=\"2.000000\" name=\"01EWNCRDDRCQHYREXYENQQMZ5K\" page=\"0\" rect=\"334.138672,277.398102,504.263092,406.076691\" style=\"cloudy\" title=\"Raluca Metiu\" width=\"5.000000\"/>" +
     "<square color=\"#2492FB\" creationdate=\"D:20210414204655Z\" date=\"D:20210414204655Z\" flags=\"print\" intensity=\"2.000000\" name=\"02E6358C-D1BE-40B5-AF7B-3DB2A1FD7701\" page=\"0\" rect=\"122.946548,1212.740479,170.956787,1260.750732\" style=\"cloudy\" title=\"Calvin Gonsalves\" width=\"5.000000\"/>" +
       "<stamp color=\"#660502\" creationdate=\"D:20210324152559Z\" date=\"D:20210324152559Z\" flags=\"print\" name=\"03fa228e-5b0b-4dcb-93b5-f859419be703\" page=\"0\" rect=\"1091.397705,1341.430786,1126.397705,1376.430786\" style=\"solid\" width=\"1.000000\"><appearance>PERJQ1QgS0VZPSJBUCI+PFNUUkVBTSBLRVk9Ik4iPjxBUlJBWSBLRVk9IkJCb3giPjxGSVhFRCBWQUw9IjEwOTEuMzk3NzA1Ii8+CjxGSVhFRCBWQUw9IjEzNDEuNDMwNzg2Ii8+CjxGSVhFRCBWQUw9IjExMjYuMzk3NzA1Ii8+CjxGSVhFRCBWQUw9IjEzNzYuNDMwNzg2Ii8+CjwvQVJSQVk+CjxJTlQgS0VZPSJGb3JtVHlwZSIgVkFMPSIxIi8+CjxJTlQgS0VZPSJMZW5ndGgiIFZBTD0iNzE0Ii8+CjxBUlJBWSBLRVk9Ik1hdHJpeCI+PEZJWEVEIFZBTD0iMS4wMDAwMDAiLz4KPEZJWEVEIFZBTD0iMC4wMDAwMDAiLz4KPEZJWEVEIFZBTD0iMC4wMDAwMDAiLz4KPEZJWEVEIFZBTD0iMS4wMDAwMDAiLz4KPEZJWEVEIFZBTD0iLTEwOTEuMzk3NzA1Ii8+CjxGSVhFRCBWQUw9Ii0xMzQxLjQzMDc4NiIvPgo8L0FSUkFZPgo8TkFNRSBLRVk9Ik5hbWUiIFZBTD0iRlJNIi8+CjxJTlQgS0VZPSJQU1BERjpWIiBWQUw9IjEiLz4KPERJQ1QgS0VZPSJSZXNvdXJjZXMiPjxESUNUIEtFWT0iRm9udCI+PERJQ1QgS0VZPSJIZWx2ZXRpY2EtQm9sZF8wIj48TkFNRSBLRVk9IkJhc2VGb250IiBWQUw9IkhlbHZldGljYS1Cb2xkIi8+CjxOQU1FIEtFWT0iRW5jb2RpbmciIFZBTD0iV2luQW5zaUVuY29kaW5nIi8+CjxOQU1FIEtFWT0iU3VidHlwZSIgVkFMPSJUeXBlMSIvPgo8TkFNRSBLRVk9IlR5cGUiIFZBTD0iRm9udCIvPgo8L0RJQ1Q+CjwvRElDVD4KPC9ESUNUPgo8TkFNRSBLRVk9IlN1YnR5cGUiIFZBTD0iRm9ybSIvPgo8TkFNRSBLRVk9IlR5cGUiIFZBTD0iWE9iamVjdCIvPgo8REFUQSBFTkNPRElORz0iSEVYIiBNT0RFPSJSQVciPjcxMEEzMDIwNEEwQTVCNUQzMDIwNjQwQTMwMjA2QTBBMzEyMDc3MEEzMTMwMjA0RDBBMzEyMDMwMjAzMDIwMzEyMDMwMjAzMDIwNjM2RDIwMEEzMDJFMzQyMDMwMkUzMDMxMzkzNjMwMzczODIwMzAyRTMwMzAzNzM4MzQzMzMxMzQyMDUyNDcwQTMwMkUzOTMwMzEzOTM2MzEyMDMwMkUzNTMyMzEzNTM2MzkyMDMwMkUzNTMwMzkzODMwMzQyMDcyNjcwQTMxMzAzOTM3MkUzODM5MzczNzMwMzUyMDMxMzMzNDMxMkUzOTMzMzAzNzM4MzYyMDZEMjAzMTMwMzkzNDJFMzUzODMzMzkzODM0MjAzMTMzMzQzMTJFMzkzMzMwMzczODM2MjAzMTMwMzkzMTJFMzgzOTM3MzczMDM1MjAzMTMzMzQzNDJFMzYzMTM3MzAzNjM1MjAzMTMwMzkzMTJFMzgzOTM3MzczMDM1MjAzMTMzMzQzNzJFMzkzMzMwMzczODM2MjA2MzBBMzEzMDM5MzEyRTM4MzkzNzM3MzAzNTIwMzEzMzM2MzkyRTM5MzMzMDM3MzgzNjIwNkMyMDMxMzAzOTMxMkUzODM5MzczNzMwMzUyMDMxMzMzNzMzMkUzMjM0MzQzNTMwMzcyMDMxMzAzOTM0MkUzNTM4MzMzOTM4MzQyMDMxMzMzNzM1MkUzOTMzMzAzNzM4MzYyMDMxMzAzOTM3MkUzODM5MzczNzMwMzUyMDMxMzMzNzM1MkUzOTMzMzAzNzM4MzYyMDYzMEEzMTMxMzEzOTJFMzgzOTM3MzczMDM1MjAzMTMzMzczNTJFMzkzMzMwMzczODM2MjA2QzIwMzEzMTMyMzMyRTMyMzEzMTM0MzIzNjIwMzEzMzM3MzUyRTM5MzMzMDM3MzgzNjIwMzEzMTMyMzUyRTM4MzkzNzM3MzAzNTIwMzEzMzM3MzMyRTMyMzQzNDM1MzAzNzIwMzEzMTMyMzUyRTM4MzkzNzM3MzAzNTIwMzEzMzM2MzkyRTM5MzMzMDM3MzgzNjIwNjMwQTMxMzEzMjM1MkUzODM5MzczNzMwMzUyMDMxMzMzNDM3MkUzOTMzMzAzNzM4MzYyMDZDMjAzMTMxMzIzNTJFMzgzOTM3MzczMDM1MjAzMTMzMzQzNDJFMzYzMTM3MzAzNjM1MjAzMTMxMzIzMzJFMzIzMTMxMzQzMjM2MjAzMTMzMzQzMTJFMzkzMzMwMzczODM2MjAzMTMxMzEzOTJFMzgzOTM3MzczMDM1MjAzMTMzMzQzMTJFMzkzMzMwMzczODM2MjA2MzBBMzEzMDM5MzcyRTM4MzkzNzM3MzAzNTIwMzEzMzM0MzEyRTM5MzMzMDM3MzgzNjIwNkMyMDY4MjA0MjJBMjAwQTUxMEE3MTBBMkY1NDc4MjA0MjRENDMwQTIwNzEwQTMxMkUzMDMwMzAzMDMwMzAyMDMwMkUzMDMwMzAzMDMwMzAyMDMwMkUzMDMwMzAzMDMwMzAyMDMxMkUzMDMwMzAzMDMwMzAyMDMwMkUzMDMwMzAzMDMwMzAyMDMwMkUzMDMwMzAzMDMwMzAyMDYzNkQwQTMwMkUzNDIwMzAyRTMwMzEzOTM2MzAzNzM4MjAzMDJFMzAzMDM3MzgzNDMzMzEzNDIwNzI2NzBBNDI1NDBBMzEyMDMwMjAzMDIwMzEyMDMxMzEzMDMwMkUzNTM3MjAzMTMzMzQzOTJFMzkzNjIwNTQ2RDBBMkY0ODY1NkM3NjY1NzQ2OTYzNjEyRDQyNkY2QzY0NUYzMDIwMzIzNTIwNTQ2NjBBMjg1MDI5MjA1NDZBMEEzMTM2MkUzNjM1MjAzMDIwNTQ2NDBBNDU1NDBBNTEwQTQ1NEQ0MzBBNTEwQTwvREFUQT4KPC9TVFJFQU0+CjwvRElDVD4K</appearance>" +
       "</stamp>"+
       "<stamp color=\"#660502\" creationdate=\"D:20210324174611Z\" date=\"D:20210324174611Z\" flags=\"print\" name=\"17b876c5-8539-49fa-ad3d-d8c6083140ff\" page=\"0\" rect=\"937.947693,939.262573,972.947693,974.262573\" style=\"solid\" width=\"1.000000\"><appearance>PERJQ1QgS0VZPSJBUCI+PFNUUkVBTSBLRVk9Ik4iPjxBUlJBWSBLRVk9IkJCb3giPjxGSVhFRCBWQUw9IjkzNy45NDc2OTMiLz4KPEZJWEVEIFZBTD0iOTM5LjI2MjU3MyIvPgo8RklYRUQgVkFMPSI5NzIuOTQ3NjkzIi8+CjxGSVhFRCBWQUw9Ijk3NC4yNjI1NzMiLz4KPC9BUlJBWT4KPElOVCBLRVk9IkZvcm1UeXBlIiBWQUw9IjEiLz4KPElOVCBLRVk9Ikxlbmd0aCIgVkFMPSI2ODAiLz4KPEFSUkFZIEtFWT0iTWF0cml4Ij48RklYRUQgVkFMPSIxLjAwMDAwMCIvPgo8RklYRUQgVkFMPSIwLjAwMDAwMCIvPgo8RklYRUQgVkFMPSIwLjAwMDAwMCIvPgo8RklYRUQgVkFMPSIxLjAwMDAwMCIvPgo8RklYRUQgVkFMPSItOTM3Ljk0NzY5MyIvPgo8RklYRUQgVkFMPSItOTM5LjI2MjU3MyIvPgo8L0FSUkFZPgo8TkFNRSBLRVk9Ik5hbWUiIFZBTD0iRlJNIi8+CjxJTlQgS0VZPSJQU1BERjpWIiBWQUw9IjEiLz4KPERJQ1QgS0VZPSJSZXNvdXJjZXMiPjxESUNUIEtFWT0iRm9udCI+PERJQ1QgS0VZPSJIZWx2ZXRpY2EtQm9sZF8wIj48TkFNRSBLRVk9IkJhc2VGb250IiBWQUw9IkhlbHZldGljYS1Cb2xkIi8+CjxOQU1FIEtFWT0iRW5jb2RpbmciIFZBTD0iV2luQW5zaUVuY29kaW5nIi8+CjxOQU1FIEtFWT0iU3VidHlwZSIgVkFMPSJUeXBlMSIvPgo8TkFNRSBLRVk9IlR5cGUiIFZBTD0iRm9udCIvPgo8L0RJQ1Q+CjwvRElDVD4KPC9ESUNUPgo8TkFNRSBLRVk9IlN1YnR5cGUiIFZBTD0iRm9ybSIvPgo8TkFNRSBLRVk9IlR5cGUiIFZBTD0iWE9iamVjdCIvPgo8REFUQSBFTkNPRElORz0iSEVYIiBNT0RFPSJSQVciPjcxMEEzMDIwNEEwQTVCNUQzMDIwNjQwQTMwMjA2QTBBMzEyMDc3MEEzMTMwMjA0RDBBMzEyMDMwMjAzMDIwMzEyMDMwMjAzMDIwNjM2RDIwMEEzMDJFMzQyMDMwMkUzMDMxMzkzNjMwMzczODIwMzAyRTMwMzAzNzM4MzQzMzMxMzQyMDUyNDcwQTMwMkUzOTMwMzEzOTM2MzEyMDMwMkUzNTMyMzEzNTM2MzkyMDMwMkUzNTMwMzkzODMwMzQyMDcyNjcwQTM5MzQzNDJFMzQzNDM3MzYzOTMzMjAzOTMzMzkyRTM3MzYzMjM1MzczMzIwNkQyMDM5MzQzMTJFMzEzMzMzMzkzNzMyMjAzOTMzMzkyRTM3MzYzMjM1MzczMzIwMzkzMzM4MkUzNDM0MzczNjM5MzMyMDM5MzQzMjJFMzQzNDM4MzgzNTMzMjAzOTMzMzgyRTM0MzQzNzM2MzkzMzIwMzkzNDM1MkUzNzM2MzIzNTM3MzMyMDYzMEEzOTMzMzgyRTM0MzQzNzM2MzkzMzIwMzkzNjM3MkUzNzM2MzIzNTM3MzMyMDZDMjAzOTMzMzgyRTM0MzQzNzM2MzkzMzIwMzkzNzMxMkUzMDM3MzYzMjM5MzQyMDM5MzQzMTJFMzEzMzMzMzkzNzMyMjAzOTM3MzMyRTM3MzYzMjM1MzczMzIwMzkzNDM0MkUzNDM0MzczNjM5MzMyMDM5MzczMzJFMzczNjMyMzUzNzMzMjA2MzBBMzkzNjM2MkUzNDM0MzczNjM5MzMyMDM5MzczMzJFMzczNjMyMzUzNzMzMjA2QzIwMzkzNjM5MkUzNzM2MzEzNDMxMzQyMDM5MzczMzJFMzczNjMyMzUzNzMzMjAzOTM3MzIyRTM0MzQzNzM2MzkzMzIwMzkzNzMxMkUzMDM3MzYzMjM5MzQyMDM5MzczMjJFMzQzNDM3MzYzOTMzMjAzOTM2MzcyRTM3MzYzMjM1MzczMzIwNjMwQTM5MzczMjJFMzQzNDM3MzYzOTMzMjAzOTM0MzUyRTM3MzYzMjM1MzczMzIwNkMyMDM5MzczMjJFMzQzNDM3MzYzOTMzMjAzOTM0MzIyRTM0MzQzODM4MzUzMzIwMzkzNjM5MkUzNzM2MzEzNDMxMzQyMDM5MzMzOTJFMzczNjMyMzUzNzMzMjAzOTM2MzYyRTM0MzQzNzM2MzkzMzIwMzkzMzM5MkUzNzM2MzIzNTM3MzMyMDYzMEEzOTM0MzQyRTM0MzQzNzM2MzkzMzIwMzkzMzM5MkUzNzM2MzIzNTM3MzMyMDZDMjA2ODIwNDIyQTIwMEE1MTBBNzEwQTJGNTQ3ODIwNDI0RDQzMEEyMDcxMEEzMTJFMzAzMDMwMzAzMDMwMjAzMDJFMzAzMDMwMzAzMDMwMjAzMDJFMzAzMDMwMzAzMDMwMjAzMTJFMzAzMDMwMzAzMDMwMjAzMDJFMzAzMDMwMzAzMDMwMjAzMDJFMzAzMDMwMzAzMDMwMjA2MzZEMEEzMDJFMzQyMDMwMkUzMDMxMzkzNjMwMzczODIwMzAyRTMwMzAzNzM4MzQzMzMxMzQyMDcyNjcwQTQyNTQwQTMxMjAzMDIwMzAyMDMxMjAzOTM0MzcyRTMxMzIzMzIwMzkzNDM3MkUzNzM4MzgyMDU0NkQwQTJGNDg2NTZDNzY2NTc0Njk2MzYxMkQ0MjZGNkM2NDVGMzAyMDMyMzUyMDU0NjYwQTI4NTAyOTIwNTQ2QTBBMzEzNjJFMzYzNTIwMzAyMDU0NjQwQTQ1NTQwQTUxMEE0NTRENDMwQTUxMEE8L0RBVEE+CjwvU1RSRUFNPgo8L0RJQ1Q+Cg==</appearance>"+
       "</stamp>"+
       "<freetext creationdate=\"D:20210212142900Z\" date=\"D:20210212142903Z\" flags=\"print\" fringe=\"0.000000,0.000000,0.000000,0.000000\" name=\"28EA0493-BFCD-4529-BC16-D1A6BC57E0B6\" page=\"0\" rect=\"1380.545898,581.726807,1399.209961,598.726807\" title=\"Ken Wiafe\" width=\"0.000000\"><contents>Txt</contents>"+
            "<contents-richtext><body xmlns=\"http://www.w3.org/1999/xhtml\" xmlns:xfa=\"http://www.xfa.org/schema/xfa-data/1.0/\" xfa:APIVersion=\"Acrobat:11.0.12\" xfa:spec=\"2.0.2\"><p>Txt</p></body></contents-richtext>"+
        "<defaultappearance>/Helvetica_0 12 Tf 0 0 0 rg </defaultappearance>"+
        "<defaultstyle>font:12.00pt \"Helvetica\"; color:#000000; </defaultstyle>"+
        "</freetext>"+
        "<stamp color=\"#660502\" creationdate=\"D:20210324184923Z\" date=\"D:20210324184923Z\" flags=\"print\" name=\"29350fd4-9adf-418d-8c62-e5521307157c\" page=\"0\" rect=\"530.810181,866.230774,565.810181,901.230774\" style=\"solid\" width=\"1.000000\"><appearance>PERJQ1QgS0VZPSJBUCI+PFNUUkVBTSBLRVk9Ik4iPjxBUlJBWSBLRVk9IkJCb3giPjxGSVhFRCBWQUw9IjUzMC44MTAxODEiLz4KPEZJWEVEIFZBTD0iODY2LjIzMDc3NCIvPgo8RklYRUQgVkFMPSI1NjUuODEwMTgxIi8+CjxGSVhFRCBWQUw9IjkwMS4yMzA3NzQiLz4KPC9BUlJBWT4KPElOVCBLRVk9IkZvcm1UeXBlIiBWQUw9IjEiLz4KPElOVCBLRVk9Ikxlbmd0aCIgVkFMPSI2ODAiLz4KPEFSUkFZIEtFWT0iTWF0cml4Ij48RklYRUQgVkFMPSIxLjAwMDAwMCIvPgo8RklYRUQgVkFMPSIwLjAwMDAwMCIvPgo8RklYRUQgVkFMPSIwLjAwMDAwMCIvPgo8RklYRUQgVkFMPSIxLjAwMDAwMCIvPgo8RklYRUQgVkFMPSItNTMwLjgxMDE4MSIvPgo8RklYRUQgVkFMPSItODY2LjIzMDc3NCIvPgo8L0FSUkFZPgo8TkFNRSBLRVk9Ik5hbWUiIFZBTD0iRlJNIi8+CjxJTlQgS0VZPSJQU1BERjpWIiBWQUw9IjEiLz4KPERJQ1QgS0VZPSJSZXNvdXJjZXMiPjxESUNUIEtFWT0iRm9udCI+PERJQ1QgS0VZPSJIZWx2ZXRpY2EtQm9sZF8wIj48TkFNRSBLRVk9IkJhc2VGb250IiBWQUw9IkhlbHZldGljYS1Cb2xkIi8+CjxOQU1FIEtFWT0iRW5jb2RpbmciIFZBTD0iV2luQW5zaUVuY29kaW5nIi8+CjxOQU1FIEtFWT0iU3VidHlwZSIgVkFMPSJUeXBlMSIvPgo8TkFNRSBLRVk9IlR5cGUiIFZBTD0iRm9udCIvPgo8L0RJQ1Q+CjwvRElDVD4KPC9ESUNUPgo8TkFNRSBLRVk9IlN1YnR5cGUiIFZBTD0iRm9ybSIvPgo8TkFNRSBLRVk9IlR5cGUiIFZBTD0iWE9iamVjdCIvPgo8REFUQSBFTkNPRElORz0iSEVYIiBNT0RFPSJSQVciPjcxMEEzMDIwNEEwQTVCNUQzMDIwNjQwQTMwMjA2QTBBMzEyMDc3MEEzMTMwMjA0RDBBMzEyMDMwMjAzMDIwMzEyMDMwMjAzMDIwNjM2RDIwMEEzMDJFMzQyMDMwMkUzMDMxMzkzNjMwMzczODIwMzAyRTMwMzAzNzM4MzQzMzMxMzQyMDUyNDcwQTMwMkUzOTMwMzEzOTM2MzEyMDMwMkUzNTMyMzEzNTM2MzkyMDMwMkUzNTMwMzkzODMwMzQyMDcyNjcwQTM1MzMzNzJFMzMzMTMwMzEzODMxMjAzODM2MzYyRTM3MzMzMDM3MzczNDIwNkQyMDM1MzMzMzJFMzkzOTM2MzQzNjMwMjAzODM2MzYyRTM3MzMzMDM3MzczNDIwMzUzMzMxMkUzMzMxMzAzMTM4MzEyMDM4MzYzOTJFMzQzMTM3MzAzNTMzMjAzNTMzMzEyRTMzMzEzMDMxMzgzMTIwMzgzNzMyMkUzNzMzMzAzNzM3MzQyMDYzMEEzNTMzMzEyRTMzMzEzMDMxMzgzMTIwMzgzOTM0MkUzNzMzMzAzNzM3MzQyMDZDMjAzNTMzMzEyRTMzMzEzMDMxMzgzMTIwMzgzOTM4MkUzMDM0MzQzNDM5MzUyMDM1MzMzMzJFMzkzOTM2MzQzNjMwMjAzOTMwMzAyRTM3MzMzMDM3MzczNDIwMzUzMzM3MkUzMzMxMzAzMTM4MzEyMDM5MzAzMDJFMzczMzMwMzczNzM0MjA2MzBBMzUzNTM5MkUzMzMxMzAzMTM4MzEyMDM5MzAzMDJFMzczMzMwMzczNzM0MjA2QzIwMzUzNjMyMkUzNjMyMzMzOTMwMzEyMDM5MzAzMDJFMzczMzMwMzczNzM0MjAzNTM2MzUyRTMzMzEzMDMxMzgzMTIwMzgzOTM4MkUzMDM0MzQzNDM5MzUyMDM1MzYzNTJFMzMzMTMwMzEzODMxMjAzODM5MzQyRTM3MzMzMDM3MzczNDIwNjMwQTM1MzYzNTJFMzMzMTMwMzEzODMxMjAzODM3MzIyRTM3MzMzMDM3MzczNDIwNkMyMDM1MzYzNTJFMzMzMTMwMzEzODMxMjAzODM2MzkyRTM0MzEzNzMwMzUzMzIwMzUzNjMyMkUzNjMyMzMzOTMwMzEyMDM4MzYzNjJFMzczMzMwMzczNzM0MjAzNTM1MzkyRTMzMzEzMDMxMzgzMTIwMzgzNjM2MkUzNzMzMzAzNzM3MzQyMDYzMEEzNTMzMzcyRTMzMzEzMDMxMzgzMTIwMzgzNjM2MkUzNzMzMzAzNzM3MzQyMDZDMjA2ODIwNDIyQTIwMEE1MTBBNzEwQTJGNTQ3ODIwNDI0RDQzMEEyMDcxMEEzMTJFMzAzMDMwMzAzMDMwMjAzMDJFMzAzMDMwMzAzMDMwMjAzMDJFMzAzMDMwMzAzMDMwMjAzMTJFMzAzMDMwMzAzMDMwMjAzMDJFMzAzMDMwMzAzMDMwMjAzMDJFMzAzMDMwMzAzMDMwMjA2MzZEMEEzMDJFMzQyMDMwMkUzMDMxMzkzNjMwMzczODIwMzAyRTMwMzAzNzM4MzQzMzMxMzQyMDcyNjcwQTQyNTQwQTMxMjAzMDIwMzAyMDMxMjAzNTMzMzkyRTM5MzgzNTIwMzgzNzM0MkUzNzM1MzYyMDU0NkQwQTJGNDg2NTZDNzY2NTc0Njk2MzYxMkQ0MjZGNkM2NDVGMzAyMDMyMzUyMDU0NjYwQTI4NTAyOTIwNTQ2QTBBMzEzNjJFMzYzNTIwMzAyMDU0NjQwQTQ1NTQwQTUxMEE0NTRENDMwQTUxMEE8L0RBVEE+CjwvU1RSRUFNPgo8L0RJQ1Q+Cg==</appearance>"+
        "</stamp>"+
        "<stamp color=\"#660502\" creationdate=\"D:20210324152325Z\" date=\"D:20210324152325Z\" flags=\"print\" name=\"456bf430-858c-4833-a26d-a3d074acf668\" page=\"0\" rect=\"1117.385254,820.462585,1152.385254,855.462585\" style=\"solid\" width=\"1.000000\"><appearance>PERJQ1QgS0VZPSJBUCI+PFNUUkVBTSBLRVk9Ik4iPjxBUlJBWSBLRVk9IkJCb3giPjxGSVhFRCBWQUw9IjExMTcuMzg1MjU0Ii8+CjxGSVhFRCBWQUw9IjgyMC40NjI1ODUiLz4KPEZJWEVEIFZBTD0iMTE1Mi4zODUyNTQiLz4KPEZJWEVEIFZBTD0iODU1LjQ2MjU4NSIvPgo8L0FSUkFZPgo8SU5UIEtFWT0iRm9ybVR5cGUiIFZBTD0iMSIvPgo8SU5UIEtFWT0iTGVuZ3RoIiBWQUw9IjY4NiIvPgo8QVJSQVkgS0VZPSJNYXRyaXgiPjxGSVhFRCBWQUw9IjEuMDAwMDAwIi8+CjxGSVhFRCBWQUw9IjAuMDAwMDAwIi8+CjxGSVhFRCBWQUw9IjAuMDAwMDAwIi8+CjxGSVhFRCBWQUw9IjEuMDAwMDAwIi8+CjxGSVhFRCBWQUw9Ii0xMTE3LjM4NTI1NCIvPgo8RklYRUQgVkFMPSItODIwLjQ2MjU4NSIvPgo8L0FSUkFZPgo8TkFNRSBLRVk9Ik5hbWUiIFZBTD0iRlJNIi8+CjxJTlQgS0VZPSJQU1BERjpWIiBWQUw9IjEiLz4KPERJQ1QgS0VZPSJSZXNvdXJjZXMiPjxESUNUIEtFWT0iRm9udCI+PERJQ1QgS0VZPSJIZWx2ZXRpY2EtQm9sZF8wIj48TkFNRSBLRVk9IkJhc2VGb250IiBWQUw9IkhlbHZldGljYS1Cb2xkIi8+CjxOQU1FIEtFWT0iRW5jb2RpbmciIFZBTD0iV2luQW5zaUVuY29kaW5nIi8+CjxOQU1FIEtFWT0iU3VidHlwZSIgVkFMPSJUeXBlMSIvPgo8TkFNRSBLRVk9IlR5cGUiIFZBTD0iRm9udCIvPgo8L0RJQ1Q+CjwvRElDVD4KPC9ESUNUPgo8TkFNRSBLRVk9IlN1YnR5cGUiIFZBTD0iRm9ybSIvPgo8TkFNRSBLRVk9IlR5cGUiIFZBTD0iWE9iamVjdCIvPgo8REFUQSBFTkNPRElORz0iSEVYIiBNT0RFPSJSQVciPjcxMEEzMDIwNEEwQTVCNUQzMDIwNjQwQTMwMjA2QTBBMzEyMDc3MEEzMTMwMjA0RDBBMzEyMDMwMjAzMDIwMzEyMDMwMjAzMDIwNjM2RDIwMEEzMDJFMzQyMDMwMkUzMDMxMzkzNjMwMzczODIwMzAyRTMwMzAzNzM4MzQzMzMxMzQyMDUyNDcwQTMwMkUzOTMwMzEzOTM2MzEyMDMwMkUzNTMyMzEzNTM2MzkyMDMwMkUzNTMwMzkzODMwMzQyMDcyNjcwQTMxMzEzMjMzMkUzODM4MzUzMjM1MzQyMDM4MzIzMDJFMzkzNjMyMzUzODM1MjA2RDIwMzEzMTMyMzAyRTM1MzczMTM1MzMzMzIwMzgzMjMwMkUzOTM2MzIzNTM4MzUyMDMxMzEzMTM3MkUzODM4MzUzMjM1MzQyMDM4MzIzMzJFMzYzNDM4MzgzNjM1MjAzMTMxMzEzNzJFMzgzODM1MzIzNTM0MjAzODMyMzYyRTM5MzYzMjM1MzgzNTIwNjMwQTMxMzEzMTM3MkUzODM4MzUzMjM1MzQyMDM4MzQzODJFMzkzNjMyMzUzODM1MjA2QzIwMzEzMTMxMzcyRTM4MzgzNTMyMzUzNDIwMzgzNTMyMkUzMjM3MzYzMzMwMzYyMDMxMzEzMjMwMkUzNTM3MzEzNTMzMzMyMDM4MzUzNDJFMzkzNjMyMzUzODM1MjAzMTMxMzIzMzJFMzgzODM1MzIzNTM0MjAzODM1MzQyRTM5MzYzMjM1MzgzNTIwNjMwQTMxMzEzNDM1MkUzODM4MzUzMjM1MzQyMDM4MzUzNDJFMzkzNjMyMzUzODM1MjA2QzIwMzEzMTM0MzkyRTMxMzkzODM5MzczNTIwMzgzNTM0MkUzOTM2MzIzNTM4MzUyMDMxMzEzNTMxMkUzODM4MzUzMjM1MzQyMDM4MzUzMjJFMzIzNzM2MzMzMDM2MjAzMTMxMzUzMTJFMzgzODM1MzIzNTM0MjAzODM0MzgyRTM5MzYzMjM1MzgzNTIwNjMwQTMxMzEzNTMxMkUzODM4MzUzMjM1MzQyMDM4MzIzNjJFMzkzNjMyMzUzODM1MjA2QzIwMzEzMTM1MzEyRTM4MzgzNTMyMzUzNDIwMzgzMjMzMkUzNjM0MzgzODM2MzUyMDMxMzEzNDM5MkUzMTM5MzgzOTM3MzUyMDM4MzIzMDJFMzkzNjMyMzUzODM1MjAzMTMxMzQzNTJFMzgzODM1MzIzNTM0MjAzODMyMzAyRTM5MzYzMjM1MzgzNTIwNjMwQTMxMzEzMjMzMkUzODM4MzUzMjM1MzQyMDM4MzIzMDJFMzkzNjMyMzUzODM1MjA2QzIwNjgyMDQyMkEyMDBBNTEwQTcxMEEyRjU0NzgyMDQyNEQ0MzBBMjA3MTBBMzEyRTMwMzAzMDMwMzAzMDIwMzAyRTMwMzAzMDMwMzAzMDIwMzAyRTMwMzAzMDMwMzAzMDIwMzEyRTMwMzAzMDMwMzAzMDIwMzAyRTMwMzAzMDMwMzAzMDIwMzAyRTMwMzAzMDMwMzAzMDIwNjM2RDBBMzAyRTM0MjAzMDJFMzAzMTM5MzYzMDM3MzgyMDMwMkUzMDMwMzczODM0MzMzMTM0MjA3MjY3MEE0MjU0MEEzMTIwMzAyMDMwMjAzMTIwMzEzMTMyMzQyRTM0MzcyMDM4MzIzODJFMzkzODM4MjA1NDZEMEEyRjQ4NjU2Qzc2NjU3NDY5NjM2MTJENDI2RjZDNjQ1RjMwMjAzMjM1MjA1NDY2MEEyODREMjkyMDU0NkEwQTQ1NTQwQTUxMEE0NTRENDMwQTUxMEE8L0RBVEE+CjwvU1RSRUFNPgo8L0RJQ1Q+Cg==</appearance>"+
        "</stamp>"+
        "</annots>" +
        "</xfdf>";

    await instance.applyOperations([{ type: "applyXfdf", xfdf }]);

    const annotations = await instance.getAnnotations(0);
    for (const annotation of annotations) {
      if (annotation.imageAttachmentId) {
        const attachment = await instance.getAttachment(
          annotation.imageAttachmentId
        );
        const attachmentId = await mainInstance.createAttachment(attachment);
        const createdAnnotations = await mainInstance.create(
          annotation.set("imageAttachmentId", attachmentId)
        );
        console.log(createdAnnotations);
      } else {
        const createdAnnotations = await mainInstance.create(annotation);
        console.log(createdAnnotations);
      }
    }
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