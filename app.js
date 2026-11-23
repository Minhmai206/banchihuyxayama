// Firebase setup
const firebaseConfig = {
  apiKey: "AIzaSyDcUZoVHrKw8W7Eil8hhwa5v33uByO3TWo", // Thay bằng apiKey thật của bạn
  authDomain: "baoquandoi-aa603.firebaseapp.com",
  databaseURL: "https://baoquandoi-aa603-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "baoquandoi-aa603",
  storageBucket: "baoquandoi-aa603.firebasestorage.app",
  messagingSenderId: "460373885866", // Thay bằng messagingSenderId thật
  appId: "1:460373885866:web:8c6de78e840b0b0683a1d3" // Thay bằng appId thật
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();

// Get articles (realtime)
async function getArticles() {
  try {
    const snapshot = await db.ref("articles").once("value");
    const data = snapshot.val() || {};
    return Object.values(data)
      .filter(Boolean)
      .sort((a, b) => Number(b.id) - Number(a.id));
  } catch (e) {
    console.error(e);
    return [];
  }
}

function safeMediaUrl(value) {
  if (typeof value !== "string" || !value.trim()) return "";
  const url = value.trim();
  if (/^data:image\/(?:jpeg|png|gif|webp);base64,/i.test(url)) return url;
  try {
    const parsed = new URL(url, window.location.href);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.href : "";
  } catch (e) {
    return "";
  }
}

function getArticleImages(article) {
  const images = Array.isArray(article.images) ? article.images.slice() : [];
  if (article.image) images.unshift(article.image);
  return Array.from(new Set(images.map(safeMediaUrl).filter(Boolean)));
}

function renderNewsCard(article) {
  const card = document.createElement("div");
  card.className = "news-card";
  const images = getArticleImages(article);
  const media = images.length
    ? `<img src="${escapeHtml(images[0])}" alt="${escapeHtml(article.title || "Ảnh bài viết")}" loading="lazy">`
    : article.video
      ? '<div class="news-card-video-placeholder" aria-label="Bài viết có video"><span>▶</span></div>'
      : '<div class="news-card-video-placeholder" aria-label="Bài viết chưa có ảnh"></div>';
  card.innerHTML = `${media}
    <div class="meta">
      <h3>${escapeHtml(article.title || "")}</h3>
      <p>${escapeHtml(article.category || "")}</p>
    </div>`;
  card.addEventListener("click", () => goDetail(article.id));
  return card;
}

// Show grid
function showArticlesGrid(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  getArticles().then(articles => {
    container.innerHTML = "";
    if (articles.length === 0) {
      container.innerHTML = "<p>Chưa có bài viết nào.</p>";
      return;
    }
    articles.forEach(article => container.appendChild(renderNewsCard(article)));
  });
}

// Go detail
function goDetail(id) {
  window.location.href = `detail.html?id=${encodeURIComponent(id)}`;
}

function getVideoEmbedUrl(value) {
  const safeUrl = safeMediaUrl(value);
  if (!safeUrl) return "";
  try {
    const url = new URL(safeUrl);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    let youtubeId = "";
    if (host === "youtu.be") {
      youtubeId = url.pathname.split("/").filter(Boolean)[0] || "";
    } else if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
      youtubeId = url.searchParams.get("v") || "";
      if (!youtubeId) {
        const parts = url.pathname.split("/").filter(Boolean);
        if (parts[0] === "embed" || parts[0] === "shorts") youtubeId = parts[1] || "";
      }
    }
    if (/^[A-Za-z0-9_-]{6,}$/.test(youtubeId)) {
      return `https://www.youtube-nocookie.com/embed/${youtubeId}`;
    }
    if (host === "vimeo.com" || host === "player.vimeo.com") {
      const videoId = url.pathname.split("/").filter(Boolean).filter(part => /^\d+$/.test(part)).pop();
      if (videoId) return `https://player.vimeo.com/video/${videoId}`;
    }
  } catch (e) {
    return "";
  }
  return "";
}

function renderArticleVideo(value) {
  const url = safeMediaUrl(value);
  if (!url) return "";
  const embedUrl = getVideoEmbedUrl(url);
  if (embedUrl) {
    return `<div class="article-video"><iframe src="${escapeHtml(embedUrl)}" title="Video bài viết" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>`;
  }
  return `<div class="article-video"><video src="${escapeHtml(url)}" controls playsinline preload="metadata">Trình duyệt của bạn không hỗ trợ phát video.</video></div>`;
}

// Show detail
async function showDetailPage(id, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const articles = await getArticles();
  const article = articles.find(item => String(item.id) === String(id));
  if (!article) {
    container.innerHTML = "<p>Bài viết không tìm thấy.</p>";
    return;
  }
  const images = getArticleImages(article);
  const imageMarkup = images.map((url, index) =>
    `<img src="${escapeHtml(url)}" alt="${escapeHtml(article.title || "Ảnh bài viết")}${images.length > 1 ? ` - ảnh ${index + 1}` : ""}" loading="${index ? "lazy" : "eager"}">`
  ).join("");
  container.innerHTML = `
    <div class="article-content">
      <h2>${escapeHtml(article.title || "")}</h2>
      <p><em>Chuyên mục: ${escapeHtml(article.category || "")}</em></p>
      ${imageMarkup ? `<div class="article-gallery">${imageMarkup}</div>` : ""}
      <div class="article-body">${nl2brEscape(article.body || "")}</div>
      ${renderArticleVideo(article.video)}
    </div>`;
}

let editId = null;
let previewObjectUrls = [];

function setUploadStatus(message, isError) {
  const status = document.getElementById("uploadStatus");
  if (!status) return;
  status.textContent = message || "";
  status.classList.toggle("is-error", Boolean(isError));
}

function clearMediaPreviews() {
  previewObjectUrls.forEach(url => URL.revokeObjectURL(url));
  previewObjectUrls = [];
  const imagePreview = document.getElementById("imagePreview");
  const videoPreview = document.getElementById("videoPreview");
  if (imagePreview) imagePreview.replaceChildren();
  if (videoPreview) videoPreview.replaceChildren();
}

function setupMediaPreviews() {
  const imageInput = document.getElementById("imageFiles");
  const videoInput = document.getElementById("videoFile");
  const updatePreviews = () => {
    clearMediaPreviews();
    Array.from(imageInput ? imageInput.files || [] : []).forEach(file => {
      const url = URL.createObjectURL(file);
      previewObjectUrls.push(url);
      const image = document.createElement("img");
      image.src = url;
      image.alt = file.name;
      document.getElementById("imagePreview").appendChild(image);
    });
    const file = videoInput && videoInput.files && videoInput.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      previewObjectUrls.push(url);
      const video = document.createElement("video");
      video.src = url;
      video.controls = true;
      video.preload = "metadata";
      document.getElementById("videoPreview").appendChild(video);
    }
  };
  if (imageInput) imageInput.addEventListener("change", updatePreviews);
  if (videoInput) videoInput.addEventListener("change", updatePreviews);
}

function getImageUrlsFromForm() {
  return document.getElementById("newImage").value
    .split(/\r?\n/)
    .map(url => url.trim())
    .filter(Boolean)
    .map(url => {
      const safeUrl = safeMediaUrl(url);
      if (!safeUrl) throw new Error(`Link ảnh không hợp lệ: ${url}`);
      return safeUrl;
    });
}

function validateMediaFiles(imageFiles, videoFile) {
  const maxImageBytes = 15 * 1024 * 1024;
  const maxVideoBytes = 100 * 1024 * 1024;
  const imageTypes = /^(image\/(jpeg|png|gif|webp|avif|bmp)|)$/i;
  const imageExtensions = /\.(jpe?g|png|gif|webp|avif|bmp)$/i;
  imageFiles.forEach(file => {
    if (!imageTypes.test(file.type) || !imageExtensions.test(file.name)) {
      throw new Error(`Định dạng ảnh "${file.name}" không được hỗ trợ. Hãy dùng JPG, PNG, GIF, WebP, AVIF hoặc BMP.`);
    }
    if (!file.size) throw new Error(`Tệp ảnh "${file.name}" đang trống.`);
    if (file.size > maxImageBytes) throw new Error(`Ảnh "${file.name}" vượt quá giới hạn 15 MB.`);
  });
  if (videoFile) {
    const videoExtension = /\.(mp4|webm|ogv|ogg)$/i.test(videoFile.name);
    const videoType = /^video\/(mp4|webm|ogg|quicktime|x-matroska)$/i.test(videoFile.type);
    if (!videoExtension || (videoFile.type && !videoType)) {
      throw new Error("Vui lòng chọn tệp video MP4, WebM hoặc Ogg.");
    }
    if (!videoFile.size) throw new Error("Tệp video đang trống.");
    if (videoFile.size > maxVideoBytes) throw new Error("Video vượt quá giới hạn 100 MB.");
  }
}

async function uploadMediaFile(storage, file, articleId, index, total, uploadedRefs) {
  const safeName = file.name.replace(/[^\w.-]/g, "_");
  const path = `articles/${articleId}/${Date.now()}_${Math.random().toString(36).slice(2)}_${safeName}`;
  const fileRef = storage.ref().child(path);
  uploadedRefs.push(fileRef);
  const task = fileRef.put(file, file.type ? { contentType: file.type } : undefined);
  return new Promise((resolve, reject) => {
    task.on("state_changed", snapshot => {
      const percent = snapshot.totalBytes
        ? Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)
        : 0;
      setUploadStatus(`Đang tải tệp ${index}/${total}: ${file.name} (${percent}%)`);
    }, reject, async () => {
      try {
        resolve(await task.snapshot.ref.getDownloadURL());
      } catch (error) {
        reject(error);
      }
    });
  });
}

// Save bài
async function saveArticle() {
  const title = document.getElementById("newTitle").value.trim();
  const body = document.getElementById("newBody").value.trim();
  const category = document.getElementById("newCategory").value;
  const imageInput = document.getElementById("imageFiles");
  const videoInput = document.getElementById("videoFile");
  const imageFiles = Array.from(imageInput.files || []);
  const videoFile = videoInput.files && videoInput.files[0];
  const saveButton = document.getElementById("saveArticleButton");

  if (!title || !body) {
    alert("Vui lòng nhập đầy đủ tiêu đề và nội dung");
    return;
  }
  if (videoFile && document.getElementById("newVideo").value.trim()) {
    if (!confirm("Bạn đã chọn cả link và tệp video. Tệp video sẽ được dùng thay cho link. Tiếp tục?")) return;
  }

  let imageUrls;
  try {
    imageUrls = getImageUrlsFromForm();
    validateMediaFiles(imageFiles, videoFile);
  } catch (error) {
    alert(error.message);
    return;
  }

  const id = editId || Date.now();
  const uploadedRefs = [];
  saveButton.disabled = true;
  try {
    const totalUploads = imageFiles.length + (videoFile ? 1 : 0);
    if (totalUploads && typeof firebase.storage !== "function") {
      throw new Error("Firebase Storage chưa được bật hoặc chưa tải SDK lưu trữ.");
    }
    const storage = totalUploads ? firebase.storage() : null;
    let uploadIndex = 0;
    for (const file of imageFiles) {
      uploadIndex += 1;
      imageUrls.push(await uploadMediaFile(storage, file, id, uploadIndex, totalUploads, uploadedRefs));
    }
    let video = document.getElementById("newVideo").value.trim();
    if (videoFile) {
      uploadIndex += 1;
      video = await uploadMediaFile(storage, videoFile, id, uploadIndex, totalUploads, uploadedRefs);
    } else if (video) {
      const safeVideoUrl = safeMediaUrl(video);
      if (!safeVideoUrl) throw new Error("Link video không hợp lệ. Chỉ hỗ trợ link HTTP hoặc HTTPS.");
      video = safeVideoUrl;
    }

    const uniqueImages = Array.from(new Set(imageUrls));
    const article = {
      id,
      title,
      image: uniqueImages[0] || "",
      images: uniqueImages,
      video,
      body,
      category
    };
    await db.ref("articles/" + id).set(article);
    setUploadStatus("");
    alert(editId ? "Cập nhật thành công!" : "Đã đăng bài!");
    resetForm();
    showAdminArticles("adminList");
  } catch (error) {
    console.error(error);
    await Promise.all(uploadedRefs.map(fileRef =>
      fileRef.delete().catch(cleanupError => console.error("Không thể dọn tệp tải lên chưa được lưu:", cleanupError))
    ));
    setUploadStatus(`Không thể lưu bài: ${error.message}`, true);
    alert("Lỗi lưu bài: " + error.message);
  } finally {
    saveButton.disabled = false;
  }
}

// Reset form
function resetForm() {
  document.getElementById("newTitle").value = "";
  document.getElementById("newImage").value = "";
  document.getElementById("imageFiles").value = "";
  document.getElementById("newVideo").value = "";
  document.getElementById("videoFile").value = "";
  document.getElementById("newBody").value = "";
  document.getElementById("newCategory").value = "Tin Thế Giới";
  editId = null;
  clearMediaPreviews();
  setUploadStatus("");
}

// Show admin list
async function showAdminArticles(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const articles = await getArticles();
  container.innerHTML = "";
  if (articles.length === 0) {
    container.innerHTML = "<p>Chưa có bài viết.</p>";
    return;
  }
  articles.forEach(article => {
    const row = document.createElement("div");
    const left = document.createElement("div");
    left.style.flex = "1";
    left.innerHTML = `<h3>${escapeHtml(article.title || "")}</h3><small>${escapeHtml(article.category || "")}</small>`;
    const right = document.createElement("div");
    const editButton = document.createElement("button");
    editButton.className = "btn";
    editButton.textContent = "Sửa";
    editButton.addEventListener("click", () => editArticle(article.id));
    const deleteButton = document.createElement("button");
    deleteButton.className = "btn";
    deleteButton.textContent = "Xóa";
    deleteButton.addEventListener("click", () => deleteArticle(article.id));
    right.append(editButton, deleteButton);
    row.append(left, right);
    row.style.display = "flex";
    row.style.alignItems = "center";
    row.style.justifyContent = "space-between";
    row.style.borderBottom = "1px solid #eee";
    row.style.padding = "10px 0";
    container.appendChild(row);
  });
}

// Edit bài
async function editArticle(id) {
  const articles = await getArticles();
  const article = articles.find(item => String(item.id) === String(id));
  if (!article) return;
  document.getElementById("newTitle").value = article.title || "";
  document.getElementById("newImage").value = getArticleImages(article).join("\n");
  document.getElementById("newVideo").value = article.video || "";
  document.getElementById("newBody").value = article.body || "";
  document.getElementById("newCategory").value = article.category || "Tin Thế Giới";
  document.getElementById("imageFiles").value = "";
  document.getElementById("videoFile").value = "";
  clearMediaPreviews();
  setUploadStatus("");
  editId = id;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// Xóa bài
async function deleteArticle(id) {
  if (!confirm("Xác nhận xóa?")) return;
  try {
    await db.ref("articles/" + id).remove();
    alert("Xóa thành công!");
    showAdminArticles("adminList");
  } catch (err) {
    alert("Lỗi xóa: " + err.message);
  }
}

async function searchArticles() {
  const searchBox = document.getElementById("searchBox");
  const query = searchBox ? searchBox.value.trim().toLowerCase() : "";
  const articles = await getArticles();
  renderFiltered(articles.filter(article => (article.title || "").toLowerCase().includes(query)));
}

async function filterArticles() {
  const filter = document.getElementById("categoryFilter");
  const category = filter ? filter.value.trim() : "all";
  const articles = await getArticles();
  renderFiltered(category === "all"
    ? articles
    : articles.filter(article => (article.category || "").trim().toLowerCase() === category.toLowerCase()));
}

function renderFiltered(list) {
  const container = document.getElementById("news-grid");
  if (!container) return;
  container.innerHTML = "";
  if (list.length === 0) {
    container.innerHTML = "<p>Không có bài viết nào.</p>";
    return;
  }
  list.forEach(article => container.appendChild(renderNewsCard(article)));
}

function escapeHtml(str) {
  if (!str && str !== 0) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function nl2brEscape(text) {
  return escapeHtml(text).replace(/\n/g, "<br>");
}

function filterByCategory(category) {
  const filter = document.getElementById("categoryFilter");
  if (filter) {
    filter.value = category === "all" ? "all" : category;
    filterArticles();
  }
  const grid = document.getElementById("news-grid");
  if (grid) grid.scrollIntoView({ behavior: "smooth" });
}
