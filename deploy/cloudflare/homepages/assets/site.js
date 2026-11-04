// Progressive enhancement only: navigation and downloads work without JavaScript.
document.querySelectorAll('[data-year]').forEach(node => {
  node.textContent = String(new Date().getFullYear());
});

const words = {
  namaste: { sa: 'नमस्ते', roman: 'namaste', meaning: 'A greeting. A moment of connection.', detail: 'Every conversation begins somewhere.\nYours can begin here.' },
  vidya: { sa: 'विद्या', roman: 'vidyā', meaning: 'Knowledge. The joy of learning.', detail: 'A new word. A different perspective.\nThere is always more to discover.' },
  mitra: { sa: 'मित्रम्', roman: 'mitram', meaning: 'A friend. Someone to share the journey.', detail: 'Language brings us closer.\nOne conversation at a time.' },
};

document.querySelectorAll('[data-word]').forEach(button => {
  button.addEventListener('click', () => {
    const word = words[button.dataset.word];
    document.querySelectorAll('[data-word]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    document.getElementById('word-sa').textContent = word.sa;
    document.getElementById('word-roman').textContent = word.roman;
    document.getElementById('word-meaning').textContent = word.meaning;
    document.getElementById('word-detail').textContent = word.detail;
  });
});

// Cross-site navigation works when previewing both folders on the local server.
// Production always retains the canonical, absolute domain links in the HTML.
if (['localhost', '127.0.0.1', '[::1]'].includes(location.hostname)) {
  document.querySelectorAll('[data-local]').forEach(link => {
    link.href = `../${link.dataset.local}/`;
  });
}
