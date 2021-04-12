$(function () {
    $("#tabs").tabs();
});

function LiquidJsProcess() {
    let data = $("#liquidjs-data").val();
    let template = $("#liquidjs-template").val();

    try {
        var dataJson = JSON.parse(data);
    } catch (e) {
        alert("Failed to JSON parse the data!\n" + JSON.stringify(e));
        console.error("Failed to JSON parse the data!", e);
        return;
    }

    let liquid = new liquidjs.Liquid();

    try {
        let result = liquid.parseAndRenderSync(template, dataJson);
        $("#liquidjs-result").text(result);
    } catch (e) {
        alert("Failed to process Liquid template!\n" + JSON.stringify(e));
        console.error("Failed to process Liquid template!", e);
        return;
    }
}

async function WordFillerProcess() {
    let apiKey = $("#wordfiller-api").val();
    let data = $("#wordfiller-data").val();
    let file = $('#wordfiller-file').prop('files')[0];

    const reader = new FileReader();
    reader.addEventListener("load", async function () {
        var fileBase64 = reader.result;
        var filePost = fileBase64.split(',')[1];
        var result = await fetch(`https://word.connectors.talxis.com/api/FillWordTemplate?code=${apiKey}`, {
            method: 'POST',
            mode: 'cors',
            body: JSON.stringify({
                "document": filePost,
                "$properties": JSON.parse(data)
            })
        });
        if (!result.ok) {
            alert("Something went wrong with processing the file!");
            return;
        } else {
            var responseFile = await result.text();
            downloadBase64File("application/vnd.openxmlformats-officedocument.wordprocessingml.document", responseFile, "filled_document.docx");
        }
    }, false);
    reader.readAsDataURL(file);
}

async function Word2PdfProcess() {
    let apiKey = $("#word2pdf-api").val();
    let file = $('#word2pdf-file').prop('files')[0];

    const reader = new FileReader();
    reader.addEventListener("load", async function () {
        var fileBase64 = reader.result;
        var filePost = fileBase64.split(',')[1];
        var result = await fetch(`https://word.connectors.talxis.com/api/WordToPDF?code=${apiKey}`, {
            method: 'POST',
            mode: 'cors',
            body: JSON.stringify({
                "document": filePost
            })
        });
        if (!result.ok) {
            alert("Something went wrong with processing the file!");
            return;
        } else {
            var responseFile = await result.text();
            downloadBase64File("application/pdf", responseFile, "converted_document.pdf");
        }
    }, false);
    reader.readAsDataURL(file);
}

async function ParseSolution() {

    var fileInput = document.getElementById("solutionparser-file");

    fileList = [];
    for (let i = 0; i < fileInput.files.length; i++) {
        fileList.push((await toBase64(fileInput.files[i])).split(',')[1]);
    }

    var result = await fetch("https://pct20018-metadata.azurewebsites.net/api/parseSolution/" + document.getElementById("solutionparser-option").value, {
        method: 'POST',
        mode: 'cors',
        body: JSON.stringify(fileList)
    });

    if (!result.ok) {
        alert("Something went wrong with parsing the solutions!");
        return;
    } else {
        var responseFile = await result.text();
        var languageCode;
        switch (document.getElementById("solutionparser-option").value) {
            case "dbml":
            case "sql":
                languageCode = "sql"
                break;
            case "edmx":
            case "ribbon":
                languageCode = "xml"
                responseFile = formatXml(responseFile);
                break;
            default:
                break;
        }

        document.getElementById('solutionparser-result').innerHTML = "";

        let editor = monaco.editor.create(document.getElementById('solutionparser-result'), {
            value: responseFile,
            language: languageCode
        });

        editor = monaco.editor.colorizeElement(document.getElementById('solutionparser-result'));
    }
}

function downloadBase64File(contentType, base64Data, fileName) {
    const linkSource = `data:${contentType};base64,${base64Data}`;
    const downloadLink = document.createElement("a");
    downloadLink.href = linkSource;
    downloadLink.download = fileName;
    downloadLink.click();
}

function formatXml(xml) {
    const PADDING = ' '.repeat(2);
    const reg = /(>)(<)(\/*)/g;
    let pad = 0;
  
    xml = xml.replace(reg, '$1\r\n$2$3');
  
    return xml.split('\r\n').map((node, index) => {
      let indent = 0;
      if (node.match(/.+<\/\w[^>]*>$/)) {
        indent = 0;
      } else if (node.match(/^<\/\w/) && pad > 0) {
        pad -= 1;
      } else if (node.match(/^<\w[^>]*[^\/]>.*$/)) {
        indent = 1;
      } else {
        indent = 0;
      }
  
      pad += indent;
  
      return PADDING.repeat(pad - indent) + node;
    }).join('\r\n');
  }

function loadEditor() {
    // Based on https://jsfiddle.net/developit/bwgkr6uq/ which just works but is based on unpkg.com.
    // Provided by loader.min.js.
    require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.20.0/min/vs' } });
    window.MonacoEnvironment = { getWorkerUrl: () => proxy };
    let proxy = URL.createObjectURL(new Blob([`
        self.MonacoEnvironment = {
            baseUrl: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.23.0/min'
        };
        importScripts('https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.23.0/min/vs/base/worker/workerMain.min.js');
    `], { type: 'text/javascript' }));
    require(["vs/editor/editor.main"], function () {
    });
} loadEditor();

const toBase64 = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
});

var prettifyXml = function (sourceXml) {
    var xmlDoc = new DOMParser().parseFromString(sourceXml, 'application/xml');
    var xsltDoc = new DOMParser().parseFromString([
        // describes how we want to modify the XML - indent everything
        '<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
        '  <xsl:strip-space elements="*"/>',
        '  <xsl:template match="para[content-style][not(text())]">', // change to just text() to strip space in text nodes
        '    <xsl:value-of select="normalize-space(.)"/>',
        '  </xsl:template>',
        '  <xsl:template match="node()|@*">',
        '    <xsl:copy><xsl:apply-templates select="node()|@*"/></xsl:copy>',
        '  </xsl:template>',
        '  <xsl:output indent="yes"/>',
        '</xsl:stylesheet>',
    ].join('\n'), 'application/xml');

    var xsltProcessor = new XSLTProcessor();
    xsltProcessor.importStylesheet(xsltDoc);
    var resultDoc = xsltProcessor.transformToDocument(xmlDoc);
    var resultXml = new XMLSerializer().serializeToString(resultDoc);
    return resultXml;
};