const BAG_STORAGE_KEY = "ua-bag-items";

function getStoredBag() {
  try {
    const raw = window.localStorage.getItem(BAG_STORAGE_KEY);
    const items = raw ? JSON.parse(raw) : [];
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}

function setStoredBag(items) {
  window.localStorage.setItem(BAG_STORAGE_KEY, JSON.stringify(items));
}

function formatMoney(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);
}

function parseMoney(text) {
  const numeric = Number(String(text).replace(/[^0-9.]/g, ""));
  return Number.isFinite(numeric) ? numeric : 0;
}

function buildBagItem(product) {
  return {
    id: `${product.name}::${product.color}::${product.size}`,
    name: product.name,
    color: product.color,
    size: product.size,
    price: product.price,
    originalPrice: product.originalPrice,
    imageSrc: product.imageSrc,
    imageAlt: product.imageAlt,
    quantity: 1,
  };
}

function syncSelection(containerSelector, itemSelector) {
  const container = document.querySelector(containerSelector);
  if (!container) {
    return;
  }

  const items = Array.from(container.querySelectorAll(itemSelector));
  if (!items.length) {
    return;
  }

  const setActive = (activeItem) => {
    items.forEach((item) => {
      const isActive = item === activeItem;
      item.classList.toggle("active", isActive);
      item.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
  };

  items.forEach((item) => {
    item.setAttribute("aria-pressed", item.classList.contains("active") ? "true" : "false");
    item.addEventListener("click", () => setActive(item));
  });
}

function initProductPage() {
  const addToBagButton = document.querySelector("[data-add-to-bag]");
  const productSummary = document.querySelector(".product-summary");
  const productSubtitle = document.querySelector(".product-subtitle");
  const productImage = document.querySelector(".product-image-card img");
  const thumbContainer = document.querySelector(".product-thumbs");

  if (!productSummary) {
    return;
  }

  syncSelection(".size-grid", ".size-chip");

  if (thumbContainer) {
    const thumbs = Array.from(thumbContainer.querySelectorAll(".thumb"));
    thumbs.forEach((thumb) => {
      thumb.setAttribute("aria-pressed", thumb.classList.contains("active") ? "true" : "false");
      thumb.addEventListener("click", () => {
        thumbs.forEach((item) => {
          item.classList.remove("active");
          item.setAttribute("aria-pressed", "false");
        });

        thumb.classList.add("active");
        thumb.setAttribute("aria-pressed", "true");

        const label = thumb.dataset.color || thumb.textContent.replace(/\s+/g, " ").trim();
        const imageSrc = thumb.dataset.image || "";
        if (productSubtitle) {
          productSubtitle.textContent = label;
        }

        if (productImage && imageSrc) {
          productImage.src = imageSrc;
          productImage.alt = `Curry 12 Team unisex basketball shoe in ${label}`;
        }
      });
    });
  }

  if (!addToBagButton) {
    return;
  }

  addToBagButton.addEventListener("click", () => {
    const name = productSummary.querySelector("h1")?.textContent.trim() || "Product";
    const size =
      productSummary.querySelector(".size-chip.active")?.textContent.trim() || "One Size";
    const color = productSubtitle?.textContent.trim() || "Default Color";
    const price = parseMoney(productSummary.querySelector(".price-sale")?.textContent || "0");
    const originalPrice = parseMoney(
      productSummary.querySelector(".price-original")?.textContent || "0"
    );
    const imageSrc = productImage?.getAttribute("src") || "";
    const imageAlt = productImage?.getAttribute("alt") || name;

    const bag = getStoredBag();
    const itemId = `${name}::${color}::${size}`;
    const existingItem = bag.find((item) => item.id === itemId);

    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      bag.push(
        buildBagItem({
          name,
          color,
          size,
          price,
          originalPrice,
          imageSrc,
          imageAlt,
        })
      );
    }

    setStoredBag(bag);
    window.location.href = "bag.html#bag";
  });
}

function initBagPage() {
  const bagCount = document.querySelector("#bag-count");
  const bagSummary = document.querySelector("#bag-summary");
  const bagTotal = document.querySelector("#bag-total");
  const bagItems = document.querySelector("#bag-items");
  const bagEmpty = document.querySelector("#bag-empty");
  const clearBagButton = document.querySelector("#clear-bag");

  if (!bagCount || !bagSummary || !bagTotal || !bagItems || !bagEmpty || !clearBagButton) {
    return;
  }

  const renderBag = () => {
    const bag = getStoredBag();
    const itemCount = bag.reduce((count, item) => count + item.quantity, 0);
    const total = bag.reduce((sum, item) => sum + item.price * item.quantity, 0);

    bagCount.textContent = `${itemCount} ${itemCount === 1 ? "item" : "items"} in bag`;
    bagSummary.textContent =
      itemCount > 0 ? "Your Curry 12 Team is saved in the bag." : "Your bag is empty.";
    bagTotal.textContent = formatMoney(total);

    bagItems.innerHTML = "";

    bagEmpty.hidden = itemCount > 0;
    bagItems.hidden = itemCount === 0;
    clearBagButton.hidden = itemCount === 0;

    if (!itemCount) {
      return;
    }

    bag.forEach((item) => {
      const article = document.createElement("article");
      article.className = "bag-item";
      article.innerHTML = `
        <img src="${item.imageSrc}" alt="${item.imageAlt}">
        <div class="bag-item-meta">
          <h3>${item.name}</h3>
          <p>${item.color}</p>
          <p>Size ${item.size}</p>
          <p>${formatMoney(item.price)}${item.quantity > 1 ? ` x ${item.quantity}` : ""}</p>
        </div>
        <div class="bag-item-actions">
          <strong>${formatMoney(item.price * item.quantity)}</strong>
          <button class="bag-remove" type="button" data-remove-item="${item.id}">Remove</button>
        </div>
      `;
      bagItems.appendChild(article);
    });
  };

  bagItems.addEventListener("click", (event) => {
    const removeButton = event.target.closest("[data-remove-item]");
    if (!removeButton) {
      return;
    }

    const id = removeButton.getAttribute("data-remove-item");
    const bag = getStoredBag()
      .map((item) => {
        if (item.id !== id) {
          return item;
        }

        if (item.quantity > 1) {
          return { ...item, quantity: item.quantity - 1 };
        }

        return null;
      })
      .filter(Boolean);
    setStoredBag(bag);
    renderBag();
  });

  clearBagButton.addEventListener("click", () => {
    setStoredBag([]);
    renderBag();
  });

  renderBag();
}

document.addEventListener("DOMContentLoaded", () => {
  initProductPage();
  initBagPage();
});
