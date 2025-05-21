const DarkBg = "linear-gradient(135deg, #23272f 0%, #0d1117 100%)";
const DarkText = "#c9d1d9";
const LightBg = "#ffffff";
const LightText = "#24292f";
const CardLightBg = "#f3f4f6";
const CardDarkBg = "#22272e";

const btn = document.getElementById('modeToggle');
const introCard = document.getElementById('introCard');

function setDarkMode(on) {

  // 保存主题偏好到 localStorage
  localStorage.setItem('darkMode', on);

  if (on) {
    document.body.classList.remove('light-mode');
    document.body.classList.add('dark-mode');
    document.querySelector('.navbar').classList.remove('navbar-default');
    document.querySelector('.navbar').classList.add('navbar-inverse');
    btn.textContent = "☀️ Light Mode";
    btn.classList.remove('btn-default');
    btn.classList.add('btn-warning');
    introCard.style.background = CardDarkBg;
    introCard.style.color = DarkText;
  } else {
    document.body.classList.remove('dark-mode');
    document.body.classList.add('light-mode');
    document.querySelector('.navbar').classList.remove('navbar-inverse');
    document.querySelector('.navbar').classList.add('navbar-default');
    btn.textContent = "🌙 Dark Mode";
    btn.classList.remove('btn-warning');
    btn.classList.add('btn-default');
    introCard.style.background = CardLightBg;
    introCard.style.color = LightText;
  }
}

let dark = localStorage.getItem('darkMode') === 'true';
btn.onclick = function () {
  dark = !dark;
  setDarkMode(dark);
};

// 页面加载时读取存储的主题设置
setDarkMode(dark);

// 整页的滚动效果
let isScrolling = false;
window.addEventListener('wheel', function (e) {
  if (isScrolling) return;
  isScrolling = true;

  const direction = e.deltaY > 0 ? 1 : -1;
  const vh = window.innerHeight;
  const curr = window.scrollY;
  let target = Math.round(curr / vh) * vh + direction * vh;
  target = Math.max(0, Math.min(target, document.body.scrollHeight - vh));

  window.scrollTo({
    top: target,
    behavior: 'smooth'
  });

  setTimeout(() => { isScrolling = false; }, 600);
  e.preventDefault();
}, { passive: false });


// 欢迎
document.addEventListener('DOMContentLoaded', function () {
  var welcomeMessage = document.getElementById('welcomeMessage');
  welcomeMessage.style.display = 'block';

  // 1秒后淡出
  setTimeout(function () {
    welcomeMessage.classList.add('fade-out');
  }, 1000);
});


// 监听滚动事件，控制按钮显示/隐藏
window.addEventListener('scroll', function () {
  const backToTopBtn = document.getElementById('backToTop');
  if (window.scrollY > 300) {
    backToTopBtn.classList.add('show');
  } else {
    backToTopBtn.classList.remove('show');
  }
});

// 点击返回顶部
document.getElementById('backToTop').addEventListener('click', function () {
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
});

// 添加动画观察器
document.addEventListener('DOMContentLoaded', function () {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      // 当元素进入视口
      if (entry.isIntersecting) {
        const animateElement = entry.target.querySelector('.animate-element');
        if (animateElement) {
          // 重置动画
          animateElement.classList.remove('slide-in');
          animateElement.classList.add('slide-reset');

          // 强制重排后添加动画
          setTimeout(() => {
            animateElement.classList.remove('slide-reset');
            animateElement.classList.add('slide-in');
          }, 10);
        }
      }
    });
  }, {
    threshold: 0.2 // 当元素20%可见时触发
  });

  // 观察所有触发器
  document.querySelectorAll('.scroll-trigger').forEach(trigger => {
    observer.observe(trigger);
  });
});
