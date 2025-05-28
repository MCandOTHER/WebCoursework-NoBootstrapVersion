const DarkBg = "linear-gradient(135deg, #23272f 0%, #0d1117 100%)";
const DarkText = "#c9d1d9";
const LightBg = "#ffffff";
const LightText = "#24292f";
const CardLightBg = "#f3f4f6";
const CardDarkBg = "#22272e";

const btn = document.getElementById('modeToggle');

function setDarkMode(on) {
  localStorage.setItem('darkMode', on);

  const cards = document.querySelectorAll('.intro-card');
  const introCard = document.querySelector('#introCard');
  const ctfCard = document.querySelector('#ctfCard');
  const gameCard = document.querySelector('#gameCard');
  const backToTopBtn = document.querySelector('#backToTop');

  if (on) {
    document.body.classList.remove('light-mode');
    document.body.classList.add('dark-mode');
    btn.textContent = "☀️ Light Mode";
    btn.style.backgroundColor = "#FFCC33"; // 深色模式下，浅色模式按钮的颜色

    cards.forEach(card => {
      card.style.background = CardDarkBg;
      card.style.color = DarkText;
    });

    if (backToTopBtn) {
      backToTopBtn.style.backgroundColor = '#333333';
      backToTopBtn.style.color = '#ffffff';
    }
  } else {
    document.body.classList.remove('dark-mode');
    document.body.classList.add('light-mode');
    btn.textContent = "🌙 Dark Mode";
    btn.style.backgroundColor = "#EBEBEB"; // 浅色模式下，深色模式按钮的颜色

    cards.forEach(card => {
      card.style.background = CardLightBg;
      card.style.color = LightText;
    });

    if (backToTopBtn) {
      backToTopBtn.style.backgroundColor = '#ffffff';
      backToTopBtn.style.color = '#333333';
    }
  }
}

// 深色模式切换函数
function toggleDarkMode() {
  document.body.classList.toggle('dark-mode');

  // 按下后更新按钮文本
  const modeToggle = document.getElementById('modeToggle');
  if (document.body.classList.contains('dark-mode')) {
    modeToggle.textContent = '☀️ LightMode';
    localStorage.setItem('darkMode', 'enabled');
  } else {
    modeToggle.textContent = '🌙 DarkMode';
    localStorage.setItem('darkMode', 'disabled');
  }
}

// 页面加载时检查深色模式状态
document.addEventListener('DOMContentLoaded', () => {
  if (localStorage.getItem('darkMode') === 'enabled') {
    document.body.classList.add('dark-mode');
    document.getElementById('modeToggle').textContent = '☀️ LightMode';
  }
});

let dark = localStorage.getItem('darkMode') === 'true';
btn.onclick = function () {
  dark = !dark;
  setDarkMode(dark);
};

// 读取存储的主题设置，保证跨页面主题不变
setDarkMode(dark);

// 欢迎
document.addEventListener('DOMContentLoaded', function () {
  var welcomeMessage = document.getElementById('welcomeMessage');
  welcomeMessage.style.display = 'block';
  setTimeout(function () {
    welcomeMessage.classList.add('fade-out');   // 1秒后淡出
  }, 1000);
});

// 监听滚动事件，控制按钮显示/隐藏
window.addEventListener('scroll', function () {
  const backToTopBtn = document.getElementById('backToTop');
  if (!backToTopBtn) return;

  if (window.scrollY > 300) {
    backToTopBtn.style.display = 'flex';
  } else {
    backToTopBtn.style.display = 'none';
  }
});

// 点击返回顶部
document.addEventListener('DOMContentLoaded', function () {
  const backToTopBtn = document.getElementById('backToTop');
  if (!backToTopBtn) return;

  backToTopBtn.addEventListener('click', function () {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  });
});

// 淡入效果
document.addEventListener('DOMContentLoaded', function () {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('slide-in');
      }
    });
  }, {
    threshold: 0.2
  });
  // 观察所有带有 animate-element 类的元素
  document.querySelectorAll('.animate-element').forEach(element => {
    observer.observe(element);
  });
});
