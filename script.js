/********************
 BASE DE DADOS
********************/
let produtos = JSON.parse(localStorage.getItem("produtos")) || [];
let videos   = JSON.parse(localStorage.getItem("videos"))   || [];
let selecionados = [];

/********************
 LOGIN ADMIN — HASH SHA-256
 Para mudar a senha:
   1. Vai a: https://emn178.github.io/online-tools/sha256.html
   2. Escreve a tua senha e copia o hash gerado
   3. Substitui o valor de SENHA_HASH abaixo
********************/
const SENHA_HASH = "78524f69cfd78e03bda23248b00f0fd5822de1de2851226594644591f5a428c3"; // hash de "1234"
let tentativas = 0;
const MAX_TENTATIVAS = 4;
const BLOQUEIO_MS = 30000; // 30 segundos

async function hashSHA256(texto) {
  const encoder = new TextEncoder();
  const data = encoder.encode(texto);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

async function entrar() {
  // verificar bloqueio ativo
  let bloqueadoAte = parseInt(sessionStorage.getItem("bloqueadoAte") || "0");
  if (Date.now() < bloqueadoAte) {
    let seg = Math.ceil((bloqueadoAte - Date.now()) / 1000);
    mostrarErroLogin(`Demasiadas tentativas. Aguarda ${seg}s.`);
    return;
  }

  let senha = document.getElementById("senha").value;
  if (!senha) return;

  let hash = await hashSHA256(senha);

  if (hash === SENHA_HASH) {
    // sucesso — limpar tentativas
    tentativas = 0;
    sessionStorage.removeItem("bloqueadoAte");
    sessionStorage.setItem("adminOk", "1");

    document.getElementById("login").style.display = "none";
    document.getElementById("painel").style.display = "block";
    mostrarAdmin();
  } else {
    tentativas++;
    let restam = MAX_TENTATIVAS - tentativas;

    if (tentativas >= MAX_TENTATIVAS) {
      tentativas = 0;
      sessionStorage.setItem("bloqueadoAte", Date.now() + BLOQUEIO_MS);
      mostrarErroLogin("Conta bloqueada por 30 segundos.");
    } else {
      mostrarErroLogin(`Senha incorreta. ${restam} tentativa(s) restante(s).`);
    }
  }
}

function mostrarErroLogin(msg) {
  let el = document.getElementById("erro-login");
  if (!el) return;
  el.textContent = msg;
  el.style.display = "block";
}

// bloquear acesso direto ao painel via URL
window.addEventListener("DOMContentLoaded", function () {
  let painel = document.getElementById("painel");
  if (painel) painel.style.display = "none";
});

/********************
 SUBCATEGORIA ADMIN
********************/
function toggleSubcatAdmin(val) {
  let sub = document.getElementById("subcategoria");
  if (!sub) return;
  sub.style.display = val === "Segunda Mao" ? "block" : "none";
}

/********************
 ADICIONAR PRODUTO
********************/
function addProduto() {
  let nome      = document.getElementById("nome").value.trim();
  let preco     = document.getElementById("preco").value.trim();
  let descricao = document.getElementById("descricao").value.trim();
  let categoria = document.getElementById("categoria").value;
  let file      = document.getElementById("imagem").files[0];

  // subcategoria só se for Segunda Mão
  let subcategoria = "";
  let subEl = document.getElementById("subcategoria");
  if (categoria === "Segunda Mao" && subEl) {
    subcategoria = subEl.value;
  }

  if (!nome || !preco || !descricao || !file) {
    alert("Preenche todos os campos");
    return;
  }

  let reader = new FileReader();
  reader.onload = function (e) {
    produtos.push({
      nome,
      preco: Number(preco),
      descricao,
      categoria,
      subcategoria,
      imagem: e.target.result,
      vendido: ""
    });

    localStorage.setItem("produtos", JSON.stringify(produtos));
    mostrarProdutos();
    mostrarAdmin();

    document.getElementById("nome").value      = "";
    document.getElementById("preco").value     = "";
    document.getElementById("descricao").value = "";
    document.getElementById("imagem").value    = "";
  };
  reader.readAsDataURL(file);
}

/********************
 COMPRAR
********************/
function comprar(nome, preco) {
  let numero = "258849042071";
  let msg = `Olá, gostei do produto estou interessado *${nome}* (${preco} MT) e quero comprar. Onde nos podemos encontrar?. 
  mensagem vinda do site`;
  window.open("https://wa.me/" + numero + "?text=" + encodeURIComponent(msg), "_blank");
}

/********************
 MOSTRAR PRODUTOS
********************/
function mostrarProdutos(lista = produtos) {
  let container = document.getElementById("lista-produtos");
  if (!container) return;

  container.innerHTML = "";

  if (lista.length === 0) {
    container.innerHTML = `
      <div style="grid-column:1/-1; text-align:center; padding:60px 20px; color:#7a8499;">
        <p style="font-size:2rem; margin-bottom:12px;">📦</p>
        <p>Nenhum produto disponível nesta categoria.</p>
      </div>`;
    return;
  }

  lista.forEach((p) => {
    let catLabel = p.categoria === "Segunda Mao"
      ? `2ª Mão · ${p.subcategoria || ""}`
      : p.categoria;

    container.innerHTML += `
      <div class="card ${p.vendido ? 'vendido' : ''}">
        <div class="card-img-wrap" onclick="abrirLightbox('${p.imagem.replace(/'/g,"\\'")}', '${p.nome.replace(/'/g,"\\'")}')">
          <img src="${p.imagem}" alt="${p.nome}">
          <span class="card-cat">${catLabel}</span>
          <span class="img-zoom-hint">🔍</span>
        </div>
        <h3>${p.nome}</h3>
        <p>${p.descricao}</p>
        <strong>${p.preco.toLocaleString('pt-MZ')} MT</strong>
        ${p.vendido && p.vendido.trim() !== ""
          ? `<span class="sold-badge">${p.vendido}</span>`
          : `<button onclick="comprar('${p.nome}', ${p.preco})">Comprar via WhatsApp</button>`
        }
      </div>`;
  });
}

/********************
 LIGHTBOX
********************/
function abrirLightbox(src, alt) {
  let lb = document.getElementById("lightbox");
  let img = document.getElementById("lightbox-img");
  if (!lb || !img) return;
  img.src = src;
  img.alt = alt;
  lb.classList.add("ativo");
  document.body.style.overflow = "hidden";
}

function fecharLightbox() {
  let lb = document.getElementById("lightbox");
  if (!lb) return;
  lb.classList.remove("ativo");
  document.body.style.overflow = "";
}

document.addEventListener("keydown", function(e) {
  if (e.key === "Escape") fecharLightbox();
});

/********************
 FILTRAR
********************/
function filtrar(cat, btn) {
  // botão ativo
  document.querySelectorAll('.cats button').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');

  // subcats
  let subcats = document.getElementById("subcats");
  if (subcats) subcats.style.display = cat === "Segunda Mao" ? "flex" : "none";

  if (cat === "todos") {
    mostrarProdutos();
  } else {
    mostrarProdutos(produtos.filter(p => p.categoria === cat));
  }
}

/********************
 FILTRAR SUBCATEGORIA (SEGUNDA MÃO)
********************/
function filtrarSub(cat, sub, btn) {
  document.querySelectorAll('.subcats button').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');

  mostrarProdutos(
    produtos.filter(p => p.categoria === cat && p.subcategoria === sub)
  );
}

/********************
 PESQUISAR
********************/
function pesquisar(termo) {
  termo = termo.toLowerCase().trim();
  if (!termo) {
    mostrarProdutos();
    return;
  }
  let resultado = produtos.filter(p =>
    p.nome.toLowerCase().includes(termo) ||
    p.descricao.toLowerCase().includes(termo) ||
    p.categoria.toLowerCase().includes(termo)
  );
  mostrarProdutos(resultado);
}

/********************
 SCROLL VER PRODUTOS
********************/
function scrollToProdutos() {
  let ancora = document.getElementById("ancora-produtos");
  if (ancora) ancora.scrollIntoView({ behavior: "smooth" });
}

/********************
 SELECIONAR
********************/
function selecionar(i) {
  if (selecionados.includes(i)) {
    selecionados = selecionados.filter(x => x !== i);
  } else {
    selecionados.push(i);
  }
  mostrarAdmin();
}

/********************
 ELIMINAR SELECIONADOS
********************/
function eliminarSelecionados() {
  if (selecionados.length === 0) { alert("Nenhum produto selecionado"); return; }
  if (!confirm(`Eliminar ${selecionados.length} produto(s)?`)) return;

  produtos = produtos.filter((_, i) => !selecionados.includes(i));
  selecionados = [];
  localStorage.setItem("produtos", JSON.stringify(produtos));
  mostrarProdutos();
  mostrarAdmin();
}

/********************
 SALVAR VENDIDO
********************/
function salvarVendido(i) {
  let input = document.getElementById(`vendido-${i}`);
  produtos[i].vendido = input.value.trim();
  localStorage.setItem("produtos", JSON.stringify(produtos));
  mostrarProdutos();
  mostrarAdmin();
}

/********************
 MOSTRAR ADMIN
********************/
function mostrarAdmin() {
  let container = document.getElementById("admin-lista");
  if (!container) return;
  container.innerHTML = "";

  if (produtos.length === 0) {
    container.innerHTML = `<p style="color:#7a8499; font-size:13px; margin-top:12px;">Nenhum produto adicionado ainda.</p>`;
    return;
  }

  produtos.forEach((p, i) => {
    let sel = selecionados.includes(i) ? "selecionado" : "";
    let catLabel = p.categoria === "Segunda Mao"
      ? `2ª Mão · ${p.subcategoria || ""}`
      : p.categoria;

    container.innerHTML += `
      <div class="card ${sel}">
        <div class="card-img-wrap">
          <img src="${p.imagem}" alt="${p.nome}">
          <span class="card-cat">${catLabel}</span>
        </div>
        <h3>${p.nome}</h3>
        <p style="font-size:12px; color:#7a8499;">${p.preco.toLocaleString('pt-MZ')} MT</p>
        <input id="vendido-${i}" value="${p.vendido || ""}" placeholder="ex: Vendido / Esgotado"/>
        <button onclick="salvarVendido(${i})">Guardar</button>
        <button onclick="selecionar(${i})" class="${selecionados.includes(i) ? 'danger' : ''}">
          ${selecionados.includes(i) ? 'Remover seleção' : 'Selecionar'}
        </button>
      </div>`;
  });
}

/********************
 VÍDEOS
********************/
function addVideo() {
  let file    = document.getElementById("video").files[0];
  let anuncio = document.getElementById("video-anuncio").value.trim();

  if (!file) { alert("Escolhe um ficheiro de vídeo"); return; }

  let reader = new FileReader();
  reader.onload = function (e) {
    videos.push({ src: e.target.result, anuncio: anuncio });
    localStorage.setItem("videos", JSON.stringify(videos));
    mostrarVideos();
    mostrarAdminVideos();
    document.getElementById("video").value        = "";
    document.getElementById("video-anuncio").value = "";
  };
  reader.readAsDataURL(file);
}

function eliminarVideo(i) {
  if (!confirm("Eliminar este anúncio?")) return;
  videos.splice(i, 1);
  localStorage.setItem("videos", JSON.stringify(videos));
  mostrarVideos();
  mostrarAdminVideos();
}

function mostrarVideos() {
  let container = document.getElementById("videos");
  if (!container) return;

  container.innerHTML = "";

  let lista = videos.map(v => typeof v === "string" ? { src: v, anuncio: "" } : v);
  if (lista.length === 0) {
    let label = document.getElementById("videos-label");
    if (label) label.style.display = "none";
    return;
  }

  let label = document.getElementById("videos-label");
  if (label) label.style.display = "flex";

  lista.forEach(v => {
    container.innerHTML += `
      <div class="video-card">
        ${v.anuncio ? `<div class="video-anuncio-topo">📢 ${v.anuncio}</div>` : ""}
        <video controls>
          <source src="${v.src}">
        </video>
      </div>`;
  });
}

function mostrarAdminVideos() {
  let container = document.getElementById("admin-videos-lista");
  if (!container) return;

  container.innerHTML = "";

  if (videos.length === 0) {
    container.innerHTML = `<p style="color:#7a8499; font-size:13px; margin-top:10px;">Nenhum anúncio publicado.</p>`;
    return;
  }

  let lista = videos.map(v => typeof v === "string" ? { src: v, anuncio: "" } : v);

  lista.forEach((v, i) => {
    container.innerHTML += `
      <div class="admin-video-item">
        <video controls>
          <source src="${v.src}">
        </video>
        ${v.anuncio ? `<p class="admin-video-anuncio">📢 ${v.anuncio}</p>` : ""}
        <button class="danger" onclick="eliminarVideo(${i})">🗑 Eliminar</button>
      </div>`;
  });
}

/********************
 INIT
********************/
mostrarProdutos();
mostrarVideos();
mostrarAdminVideos();
