const ARTICLE_MEDIA_BUCKET = "article-media";
const LEGACY_FIREBASE_CONFIG = {
  apiKey: "AIzaSyDcUZoVHrKw8W7Eil8hhwa5v33uByO3TWo",
  authDomain: "baoquandoi-aa603.firebaseapp.com",
  databaseURL: "https://baoquandoi-aa603-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "baoquandoi-aa603",
  storageBucket: "baoquandoi-aa603.firebasestorage.app",
  messagingSenderId: "460373885866",
  appId: "1:460373885866:web:8c6de78e840b0b0683a1d3"
};

function getSupabaseClient() {
  if (window.supabaseSetupError) throw new Error(window.supabaseSetupError);
  if (!window.supabaseClient) throw new Error("Supabase chưa được cấu hình.");
  return window.supabaseClient;
}

async function getArticles() {
  const { data, error } = await getSupabaseClient()
    .from("articles")
    .select("*")
    .order("id", { ascending: false });
  if (error) throw error;
  return data || [];
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
  const images = Array.isArray(article.images)
    ? article.images.slice()
    : article.images && typeof article.images === "object"
      ? Object.values(article.images)
      : [];
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
  }).catch(error => {
    console.error(error);
    container.innerHTML = `<p>Không tải được bài viết: ${escapeHtml(error.message)}</p>`;
  });
}

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

async function showDetailPage(id, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  try {
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
  } catch (error) {
    console.error(error);
    container.innerHTML = `<p>Không tải được bài viết: ${escapeHtml(error.message)}</p>`;
  }
}

let editId = null;
let editingArticle = null;
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
  const maxVideoBytes = 50 * 1024 * 1024;
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
    const videoType = /^video\/(mp4|webm|ogg)$/i.test(videoFile.type);
    if (!videoExtension || (videoFile.type && !videoType)) {
      throw new Error("Vui lòng chọn tệp video MP4, WebM hoặc Ogg.");
    }
    if (!videoFile.size) throw new Error("Tệp video đang trống.");
    if (videoFile.size > maxVideoBytes) throw new Error("Video vượt quá giới hạn 50 MB của gói miễn phí Supabase.");
  }
}

function getSupabaseStoragePath(url) {
  const safeUrl = safeMediaUrl(url);
  if (!safeUrl) return "";
  try {
    const parsed = new URL(safeUrl);
    const marker = `/storage/v1/object/public/${ARTICLE_MEDIA_BUCKET}/`;
    const pathIndex = parsed.pathname.indexOf(marker);
    return pathIndex < 0 ? "" : decodeURIComponent(parsed.pathname.slice(pathIndex + marker.length));
  } catch (e) {
    return "";
  }
}

async function uploadMediaFile(file, articleId, index, total, uploadedPaths) {
  const client = getSupabaseClient();
  const safeName = file.name.replace(/[^\w.-]/g, "_");
  const path = `articles/${articleId}/${Date.now()}_${Math.random().toString(36).slice(2)}_${safeName}`;
  setUploadStatus(`Đang tải tệp ${index}/${total}: ${file.name}`);
  const options = { cacheControl: "3600", upsert: false };
  if (file.type) options.contentType = file.type;
  const { error } = await client.storage.from(ARTICLE_MEDIA_BUCKET).upload(path, file, options);
  if (error) throw error;
  uploadedPaths.push(path);
  const { data } = client.storage.from(ARTICLE_MEDIA_BUCKET).getPublicUrl(path);
  if (!data || !data.publicUrl) throw new Error(`Không lấy được URL công khai cho tệp "${file.name}".`);
  return { path, url: data.publicUrl };
}

async function removeStoredMedia(paths) {
  const uniquePaths = Array.from(new Set((paths || []).filter(Boolean)));
  if (!uniquePaths.length) return;
  const { error } = await getSupabaseClient().storage.from(ARTICLE_MEDIA_BUCKET).remove(uniquePaths);
  if (error) throw error;
}

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
  const uploadedPaths = [];
  let articleSaved = false;
  saveButton.disabled = true;
  try {
    const totalUploads = imageFiles.length + (videoFile ? 1 : 0);
    let uploadIndex = 0;
    for (const file of imageFiles) {
      uploadIndex += 1;
      const uploaded = await uploadMediaFile(file, id, uploadIndex, totalUploads, uploadedPaths);
      imageUrls.push(uploaded.url);
    }

    let video = document.getElementById("newVideo").value.trim();
    if (videoFile) {
      uploadIndex += 1;
      const uploaded = await uploadMediaFile(videoFile, id, uploadIndex, totalUploads, uploadedPaths);
      video = uploaded.url;
    } else if (video) {
      const safeVideoUrl = safeMediaUrl(video);
      if (!safeVideoUrl) throw new Error("Link video không hợp lệ. Chỉ hỗ trợ link HTTP hoặc HTTPS.");
      video = safeVideoUrl;
    }

    const uniqueImages = Array.from(new Set(imageUrls));
    const mediaPaths = new Set(uniqueImages.map(getSupabaseStoragePath).filter(Boolean));
    const videoPath = getSupabaseStoragePath(video);
    if (videoPath) mediaPaths.add(videoPath);

    const article = {
      id,
      title,
      image: uniqueImages[0] || "",
      images: uniqueImages,
      video,
      body,
      category,
      media_paths: Array.from(mediaPaths)
    };
    const { error } = await getSupabaseClient().from("articles").upsert(article, { onConflict: "id" });
    if (error) throw error;
    articleSaved = true;

    const oldPaths = Array.isArray(editingArticle && editingArticle.media_paths)
      ? editingArticle.media_paths
      : [];
    const removedPaths = oldPaths.filter(path => !mediaPaths.has(path));
    let cleanupWarning = "";
    if (removedPaths.length) {
      try {
        await removeStoredMedia(removedPaths);
      } catch (error) {
        console.error("Không thể dọn media cũ:", error);
        cleanupWarning = " Bài đã lưu nhưng có tệp cũ chưa được xóa.";
      }
    }

    setUploadStatus("");
    alert((editId ? "Cập nhật thành công!" : "Đã đăng bài!") + cleanupWarning);
    resetForm();
    showAdminArticles("adminList");
  } catch (error) {
    console.error(error);
    if (!articleSaved && uploadedPaths.length) {
      try {
        await removeStoredMedia(uploadedPaths);
      } catch (cleanupError) {
        console.error("Không thể dọn tệp tải lên chưa được lưu:", cleanupError);
      }
    }
    setUploadStatus(`Không thể lưu bài: ${error.message}`, true);
    alert("Lỗi lưu bài: " + error.message);
  } finally {
    saveButton.disabled = false;
  }
}

function resetForm() {
  document.getElementById("newTitle").value = "";
  document.getElementById("newImage").value = "";
  document.getElementById("imageFiles").value = "";
  document.getElementById("newVideo").value = "";
  document.getElementById("videoFile").value = "";
  document.getElementById("newBody").value = "";
  document.getElementById("newCategory").value = "Tin Thế Giới";
  editId = null;
  editingArticle = null;
  clearMediaPreviews();
  setUploadStatus("");
}

async function showAdminArticles(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  try {
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
  } catch (error) {
    console.error(error);
    container.innerHTML = `<p>Không tải được danh sách bài: ${escapeHtml(error.message)}</p>`;
  }
}

async function editArticle(id) {
  try {
    const articles = await getArticles();
    const article = articles.find(item => String(item.id) === String(id));
    if (!article) return;
    editingArticle = article;
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
  } catch (error) {
    alert("Không tải được bài viết: " + error.message);
  }
}

async function deleteArticle(id) {
  if (!confirm("Xác nhận xóa?")) return;
  try {
    const client = getSupabaseClient();
    const article = (await getArticles()).find(item => String(item.id) === String(id));
    const { error } = await client.from("articles").delete().eq("id", id);
    if (error) throw error;
    let message = "Xóa bài viết thành công!";
    if (article && Array.isArray(article.media_paths) && article.media_paths.length) {
      try {
        await removeStoredMedia(article.media_paths);
      } catch (mediaError) {
        console.error("Không thể xóa media của bài viết:", mediaError);
        message += " Một số tệp media chưa được xóa.";
      }
    }
    alert(message);
    showAdminArticles("adminList");
  } catch (error) {
    alert("Lỗi xóa: " + error.message);
  }
}

async function searchArticles() {
  const searchBox = document.getElementById("searchBox");
  const query = searchBox ? searchBox.value.trim().toLowerCase() : "";
  try {
    const articles = await getArticles();
    renderFiltered(articles.filter(article => (article.title || "").toLowerCase().includes(query)));
  } catch (error) {
    renderDataError(error);
  }
}

async function filterArticles() {
  const filter = document.getElementById("categoryFilter");
  const category = filter ? filter.value.trim() : "all";
  try {
    const articles = await getArticles();
    renderFiltered(category === "all"
      ? articles
      : articles.filter(article => (article.category || "").trim().toLowerCase() === category.toLowerCase()));
  } catch (error) {
    renderDataError(error);
  }
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

function renderDataError(error) {
  const container = document.getElementById("news-grid");
  if (container) container.innerHTML = `<p>Không tải được bài viết: ${escapeHtml(error.message)}</p>`;
}

function getLegacyFirebaseDatabase() {
  if (typeof firebase === "undefined") {
    throw new Error("Firebase SDK chỉ được nạp ở trang quản trị để nhập dữ liệu cũ.");
  }
  const appName = "legacy-article-import";
  const legacyApp = firebase.apps.find(app => app.name === appName)
    || firebase.initializeApp(LEGACY_FIREBASE_CONFIG, appName);
  return firebase.database(legacyApp);
}

function normalizeLegacyArticle(article, index) {
  const parsedId = Number(article.id);
  const id = Number.isSafeInteger(parsedId) && parsedId > 0 ? parsedId : Date.now() + index;
  const images = getArticleImages(article);
  return {
    id,
    title: String(article.title || "Bài viết chưa có tiêu đề"),
    body: String(article.body || ""),
    category: String(article.category || ""),
    image: images[0] || "",
    images,
    video: safeMediaUrl(article.video),
    media_paths: []
  };
}

async function migrateLegacyArticles() {
  if (!confirm("Nhập các bài từ Firebase Realtime Database? Bài trùng ID trong Supabase sẽ được cập nhật.")) return;
  const status = document.getElementById("uploadStatus");
  try {
    setUploadStatus("Đang đọc bài viết cũ từ Firebase...");
    const snapshot = await getLegacyFirebaseDatabase().ref("articles").once("value");
    const legacyData = snapshot.val() || {};
    const rows = Object.values(legacyData)
      .filter(Boolean)
      .map(normalizeLegacyArticle)
      .filter(article => article.title && article.body);
    if (!rows.length) {
      setUploadStatus("Không tìm thấy bài viết cũ để nhập.");
      return;
    }
    const { error } = await getSupabaseClient().from("articles").upsert(rows, { onConflict: "id" });
    if (error) throw error;
    setUploadStatus(`Đã nhập ${rows.length} bài viết. Các URL media cũ được giữ nguyên; tệp không được sao chép.`);
    showAdminArticles("adminList");
  } catch (error) {
    console.error(error);
    if (status) setUploadStatus(`Không nhập được dữ liệu: ${error.message}`, true);
    alert("Không nhập được dữ liệu cũ: " + error.message);
  }
}

async function requireAdmin() {
  const status = document.getElementById("uploadStatus");
  try {
    const client = getSupabaseClient();
    const { data: sessionData, error: sessionError } = await client.auth.getSession();
    if (sessionError) throw sessionError;
    if (!sessionData.session) {
      window.location.replace("login.html");
      return false;
    }
    const { data, error } = await client
      .from("admin_users")
      .select("user_id")
      .eq("user_id", sessionData.session.user.id)
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      await client.auth.signOut();
      window.location.replace("login.html");
      return false;
    }
    return true;
  } catch (error) {
    console.error(error);
    if (status) setUploadStatus(`Không xác minh được quyền admin: ${error.message}`, true);
    return false;
  }
}

async function logoutAdmin() {
  const { error } = await getSupabaseClient().auth.signOut();
  if (error) {
    alert("Không đăng xuất được: " + error.message);
    return;
  }
  window.location.replace("login.html");
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
