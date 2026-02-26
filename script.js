let imagens = [];
let index = 0;
let contador = 1;
let tamanhoSticker = 100;
let escalaFonte = 0.45;

let marcacoes = {}; // 🔥 estado por imagem
let nomesArquivos = {}; // 🔥 nomes por imagem
let selecionados = new Set(); // 🔥 índices das imagens selecionadas para download
let modoSelecao = false; // 🔥 controla visibilidade dos checkboxes de seleção

const viewer = document.getElementById("viewer");
const img = document.getElementById("img");

let preview = null;
let arrastando = null;
let offsetX = 0;
let offsetY = 0;
let tamanhoNovoSet = false;

img.onload = () => {
    if (tamanhoNovoSet && img.clientWidth > 0) {
        tamanhoSticker = Math.round(img.clientWidth * 0.1);
        if (tamanhoSticker < 30) tamanhoSticker = 30;
        atualizarPreview();
        tamanhoNovoSet = false;
    }
};

/* ============================= */
/* UPLOAD */
/* ============================= */

document.getElementById("upload").addEventListener("change", function (e) {
    processarArquivos(e.target.files);
});

function processarArquivos(arquivos) {
    if (!arquivos || arquivos.length === 0) return;

    const novasImagens = Array.from(arquivos).filter(f => f.type.startsWith('image/'));
    if (novasImagens.length === 0) return;

    imagens = novasImagens;
    index = 0;
    marcacoes = {};
    nomesArquivos = {};
    selecionados = new Set();
    modoSelecao = false;
    document.getElementById("carousel").classList.remove("modo-selecao");
    tamanhoNovoSet = true;
    renderCarousel();
    carregarImagem();
    atualizarBotoesAcao();

    const label = document.getElementById("fileLabel");
    label.innerHTML = `<i class="ph-bold ph-check-circle"></i> ${imagens.length} imagem(ns) selecionada(s)`;
}

document.getElementById("empty-state").addEventListener("click", () => {
    document.getElementById("upload").click();
});

viewer.addEventListener("dragover", (e) => {
    e.preventDefault();
    viewer.classList.add("dragover");
});

viewer.addEventListener("dragleave", () => {
    viewer.classList.remove("dragover");
});

viewer.addEventListener("drop", (e) => {
    e.preventDefault();
    viewer.classList.remove("dragover");
    if (e.dataTransfer.files) {
        processarArquivos(e.dataTransfer.files);
    }
});

/* ============================= */
/* CARREGAR IMAGEM */
/* ============================= */

function carregarImagem() {
    const emptyState = document.getElementById("empty-state");

    if (!imagens[index]) {
        img.removeAttribute("src");
        emptyState.style.display = "flex";
        return;
    }

    emptyState.style.display = "none";

    viewer.querySelectorAll(".sticker:not(#preview)").forEach(s => s.remove());

    const reader = new FileReader();
    reader.onload = function (e) {
        img.src = e.target.result;
        restaurarMarcacoes();
        updateCarouselActive();
    }
    reader.readAsDataURL(imagens[index]);
}

let objectURLsCache = [];

function renderCarousel() {
    const carousel = document.getElementById("carousel");
    carousel.innerHTML = "";

    if (imagens.length === 0) {
        carousel.style.display = "none";
        return;
    }

    carousel.style.display = "flex";
    if (modoSelecao) carousel.classList.add("modo-selecao");
    else carousel.classList.remove("modo-selecao");

    objectURLsCache.forEach(url => URL.revokeObjectURL(url));
    objectURLsCache = [];

    imagens.forEach((file, i) => {
        const item = document.createElement("div");
        item.className = "carousel-item";
        if (i === index) item.classList.add("active");
        if (modoSelecao && selecionados.has(i)) item.classList.add("selected");

        const imgThumbnail = document.createElement("img");
        const url = URL.createObjectURL(file);
        objectURLsCache.push(url);
        imgThumbnail.src = url;

        // Checkbox/Indicator de seleção
        if (modoSelecao) {
            const indicator = document.createElement("div");
            indicator.className = "carousel-checkbox";
            indicator.innerHTML = selecionados.has(i) ? '<i class="ph-bold ph-check"></i>' : "";

            indicator.onclick = (e) => {
                e.stopPropagation();
                alternarSelecao(i);
            };
            item.appendChild(indicator);
        }

        item.onclick = () => {
            if (i !== index) {
                salvarEstadoAtual();
                index = i;
                carregarImagem();
            }
        };

        item.appendChild(imgThumbnail);
        carousel.appendChild(item);
    });
}

function alternarSelecao(i) {
    if (selecionados.has(i)) {
        selecionados.delete(i);
    } else {
        selecionados.add(i);
    }
    renderCarousel();
}

function updateCarouselActive() {
    const carousel = document.getElementById("carousel");
    const items = carousel.querySelectorAll(".carousel-item");
    items.forEach((item, i) => {
        if (i === index) item.classList.add("active");
        else item.classList.remove("active");
    });

    if (items[index]) {
        items[index].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
}

/* ============================= */
/* SALVAR ESTADO ATUAL */
/* ============================= */

function salvarEstadoAtual() {

    const stickers = viewer.querySelectorAll(".sticker:not(#preview)");
    marcacoes[index] = [];

    stickers.forEach(sticker => {
        marcacoes[index].push({
            x: parseFloat(sticker.style.left),
            y: parseFloat(sticker.style.top),
            numero: sticker.innerText
        });
    });

    nomesArquivos[index] = document.getElementById("nomeArquivo").value;
}

/* ============================= */
/* RESTAURAR */
/* ============================= */

function restaurarMarcacoes() {

    viewer.querySelectorAll(".sticker:not(#preview)").forEach(s => s.remove());

    const dados = marcacoes[index] || [];
    document.getElementById("nomeArquivo").value = nomesArquivos[index] || `photocard_${index + 1}`;

    dados.forEach(item => {
        const sticker = criarSticker(item.x, item.y, item.numero);
        viewer.appendChild(sticker);
    });

    contador = dados.length + 1;
}

/* ============================= */
/* PREVIEW */
/* ============================= */

viewer.addEventListener("mousemove", function (e) {

    if (!img.getAttribute("src")) return;

    const imgRect = img.getBoundingClientRect();
    const naImagem = (
        e.clientX >= imgRect.left &&
        e.clientX <= imgRect.right &&
        e.clientY >= imgRect.top &&
        e.clientY <= imgRect.bottom
    );

    if (!naImagem) {
        if (preview) preview.style.display = "none";
        return;
    }

    const rect = viewer.getBoundingClientRect();

    if (!preview) {
        preview = document.createElement("div");
        preview.className = "sticker";
        preview.id = "preview";
        preview.style.opacity = "0.4";
        preview.style.pointerEvents = "none";
        viewer.appendChild(preview);
    }

    preview.style.display = "flex";

    preview.style.left = (e.clientX - rect.left - tamanhoSticker / 2) + "px";
    preview.style.top = (e.clientY - rect.top - tamanhoSticker / 2) + "px";
    atualizarPreview();
});

function atualizarPreview() {
    if (!preview) return;
    preview.style.width = tamanhoSticker + "px";
    preview.style.height = tamanhoSticker + "px";
    preview.style.background = document.getElementById("cor").value;
    preview.style.fontFamily = document.getElementById("fonte").value;
    preview.style.fontSize = (tamanhoSticker * escalaFonte) + "px";
    preview.innerText = contador;
}

viewer.addEventListener("mouseleave", function () {
    if (preview) {
        preview.remove();
        preview = null;
    }
});

/* ============================= */
/* CRIAR STICKER */
/* ============================= */

viewer.addEventListener("click", function (e) {

    if (!img.getAttribute("src")) return;

    const imgRect = img.getBoundingClientRect();
    const naImagem = (
        e.clientX >= imgRect.left &&
        e.clientX <= imgRect.right &&
        e.clientY >= imgRect.top &&
        e.clientY <= imgRect.bottom
    );

    if (!naImagem) return;

    const rect = viewer.getBoundingClientRect();

    const x = e.clientX - rect.left - tamanhoSticker / 2;
    const y = e.clientY - rect.top - tamanhoSticker / 2;

    const sticker = criarSticker(x, y, contador);

    viewer.appendChild(sticker);

    if (!marcacoes[index]) marcacoes[index] = [];

    marcacoes[index].push({ x, y, numero: contador });

    contador++;
});

function criarSticker(x, y, numero) {

    const sticker = document.createElement("div");
    sticker.className = "sticker";

    sticker.style.width = tamanhoSticker + "px";
    sticker.style.height = tamanhoSticker + "px";
    sticker.style.left = x + "px";
    sticker.style.top = y + "px";
    sticker.style.background = document.getElementById("cor").value;
    sticker.style.fontFamily = document.getElementById("fonte").value;
    sticker.style.fontSize = (tamanhoSticker * escalaFonte) + "px";
    sticker.style.color = "#000";

    sticker.innerText = numero;

    /* DRAG */
    sticker.addEventListener("mousedown", function (e) {
        arrastando = sticker;
        const sRect = sticker.getBoundingClientRect();
        offsetX = e.clientX - sRect.left;
        offsetY = e.clientY - sRect.top;
        e.stopPropagation();
    });

    sticker.addEventListener("click", function (e) {
        e.stopPropagation();
    });

    return sticker;
}

/* ============================= */
/* ARRASTAR */
/* ============================= */

document.addEventListener("mousemove", function (e) {

    if (!arrastando) return;

    const vRect = viewer.getBoundingClientRect();
    const iRect = img.getBoundingClientRect();

    let x = e.clientX - vRect.left - offsetX;
    let y = e.clientY - vRect.top - offsetY;

    // Constranger dentro da imagem
    const minX = iRect.left - vRect.left;
    const maxX = iRect.right - vRect.left - tamanhoSticker;
    const minY = iRect.top - vRect.top;
    const maxY = iRect.bottom - vRect.top - tamanhoSticker;

    x = Math.max(minX, Math.min(x, maxX));
    y = Math.max(minY, Math.min(y, maxY));

    arrastando.style.left = x + "px";
    arrastando.style.top = y + "px";

    atualizarEstadoPosicao();
});

document.addEventListener("mouseup", function () {
    arrastando = null;
});

function atualizarEstadoPosicao() {

    const stickers = viewer.querySelectorAll(".sticker:not(#preview)");
    marcacoes[index] = [];

    stickers.forEach(sticker => {
        marcacoes[index].push({
            x: parseFloat(sticker.style.left),
            y: parseFloat(sticker.style.top),
            numero: sticker.innerText
        });
    });
}

/* ============================= */
/* CONTROLES */
/* ============================= */

function desfazer() {
    const stickers = viewer.querySelectorAll(".sticker:not(#preview)");
    if (stickers.length === 0) return;

    stickers[stickers.length - 1].remove();
    atualizarEstadoPosicao();
    contador--;
    if (contador < 1) contador = 1;
}

function aumentar() { tamanhoSticker += 10; atualizarPreview(); }
function diminuir() { if (tamanhoSticker > 40) tamanhoSticker -= 10; atualizarPreview(); }

document.getElementById("cor").addEventListener("input", atualizarPreview);
document.getElementById("fonte").addEventListener("change", atualizarPreview);

function proxima() {
    if (index < imagens.length - 1) {
        salvarEstadoAtual();
        index++;
        carregarImagem();
        atualizarPreview();
    }
}

function anterior() {
    if (index > 0) {
        salvarEstadoAtual();
        index--;
        carregarImagem();
        atualizarPreview();
    }
}

function baixar() {
    if (!img.getAttribute("src")) return;

    const divViewer = document.getElementById("viewer");

    // Esconder possível preview de sticker solto
    if (preview) preview.style.display = "none";

    html2canvas(divViewer, { backgroundColor: null }).then(canvas => {
        const nomeFinal = document.getElementById("nomeArquivo").value || `photocard_${index + 1}`;
        const nomeArquivoTemp = nomeFinal.toLowerCase().endsWith(".png") ? nomeFinal : `${nomeFinal}.png`;

        const link = document.createElement("a");
        link.download = nomeArquivoTemp;
        link.href = canvas.toDataURL("image/png");
        link.click();

        if (preview) preview.style.display = "";
    });
}

async function salvarTodas() {
    const indices = Array.from(imagens.keys());
    await salvarZip(indices, "meu_set_completo");
}

async function salvarSelecionadas() {
    const indices = Array.from(selecionados).sort((a, b) => a - b);
    if (indices.length === 0) {
        alert("Selecione pelo menos uma imagem no carrossel!");
        return;
    }
    await salvarZip(indices, "meu_set_selecionado");
    alternarModoSelecao(); // Sair do modo após baixar
}

function alternarModoSelecao() {
    if (imagens.length === 0) return;
    modoSelecao = !modoSelecao;
    if (!modoSelecao) selecionados.clear();

    atualizarBotoesAcao();
    renderCarousel();
}

function atualizarBotoesAcao() {
    const normalBtns = document.getElementById("botoes-normais");
    const selectionBtns = document.getElementById("botoes-selecao");

    if (modoSelecao) {
        normalBtns.style.display = "none";
        selectionBtns.style.display = "flex";
    } else {
        normalBtns.style.display = "flex";
        selectionBtns.style.display = "none";
    }
}

async function salvarZip(listaIndices, defaultName) {
    if (imagens.length === 0) return;

    const nomeZipPrompt = prompt("Qual o nome do arquivo ZIP?", defaultName);
    if (nomeZipPrompt === null) return; // Usuário cancelou

    const nomeZip = nomeZipPrompt || "set_claims";
    const zip = new JSZip();

    salvarEstadoAtual();
    const indexOriginal = index;

    if (preview) preview.style.display = "none";
    const divViewer = document.getElementById("viewer");

    for (const i of listaIndices) {
        index = i;

        // carregar imagem i
        await new Promise(resolve => {
            const reader = new FileReader();
            reader.onload = function (e) {
                img.src = e.target.result;
                restaurarMarcacoes();

                // Dar um tempo para renderizar
                setTimeout(() => {
                    html2canvas(divViewer, { backgroundColor: null }).then(canvas => {
                        const dataURL = canvas.toDataURL("image/png");
                        const base64Data = dataURL.replace(/^data:image\/(png|jpg);base64,/, "");

                        const nomeImg = nomesArquivos[i] || `photocard_${i + 1}`;
                        const nomeFinalImg = nomeImg.toLowerCase().endsWith(".png") ? nomeImg : `${nomeImg}.png`;

                        zip.file(nomeFinalImg, base64Data, { base64: true });
                        resolve();
                    });
                }, 100);
            }
            reader.readAsDataURL(imagens[i]);
        });
    }

    // voltar para imagem original
    index = indexOriginal;
    carregarImagem();
    if (preview) preview.style.display = "";

    zip.generateAsync({ type: "blob" }).then(function (content) {
        const link = document.createElement("a");
        link.href = URL.createObjectURL(content);
        link.download = `${nomeZip.toLowerCase().endsWith(".zip") ? nomeZip : nomeZip + ".zip"}`;
        link.click();
    });
}

document.addEventListener("keydown", function (e) {
    if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT" || e.target.tagName === "TEXTAREA") {
        return; // não aciona atalhos se estiver digitando num input
    }

    switch (e.key) {
        case "ArrowRight":
            proxima();
            break;
        case "ArrowLeft":
            anterior();
            break;
        case "z":
        case "Z":
            desfazer();
            break;
        case "s":
        case "S":
            baixar();
            break;
        case "a":
        case "A":
            salvarTodas();
            break;
        case "+":
            aumentar();
            break;
        case "-":
            diminuir();
            break;
    }
});

/* ============================= */
/* AJUDA / MODAL */
/* ============================= */

const helpModal = document.getElementById("helpModal");
const openHelpBtn = document.getElementById("openHelp");
const closeHelpBtn = document.getElementById("closeHelp");

openHelpBtn.onclick = () => {
    helpModal.style.display = "flex";
    setTimeout(() => helpModal.classList.add("show"), 10);
};

closeHelpBtn.onclick = () => {
    helpModal.classList.remove("show");
    setTimeout(() => helpModal.style.display = "none", 300);
};

window.onclick = (event) => {
    if (event.target == helpModal) {
        closeHelpBtn.onclick();
    }
};