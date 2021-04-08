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
        document.getElementById("solutionparser-result").innerHTML = responseFile;
    }

}

function downloadBase64File(contentType, base64Data, fileName) {
    const linkSource = `data:${contentType};base64,${base64Data}`;
    const downloadLink = document.createElement("a");
    downloadLink.href = linkSource;
    downloadLink.download = fileName;
    downloadLink.click();
}

const toBase64 = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
});