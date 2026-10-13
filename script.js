/* QuizCraft: plain JavaScript, localStorage-backed demo application */
const STORAGE_KEYS = { custom: "quizcraft_custom_quizzes_v1", attempts: "quizcraft_attempts_v1" };
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const pageRoot = $("#pageRoot");
let currentPage = "dashboard";
let activeQuiz = null;
let activeQuestionIndex = 0;
let selectedAnswers = {};
let timerId = null;
let secondsLeft = 0;
let searchTerm = "";
let exploreFilter = "All topics";
let builderCount = 0;
let lastResult = null;

const sampleQuizzes = [
  { id:"sample-html", title:"HTML Foundations", topic:"HTML", description:"Build confidence with the building blocks of every webpage.", time:3, source:"sample", questions:[
    {text:"Which HTML element creates a hyperlink?", options:["<link>","<a>","<href>","<url>"], answer:1},
    {text:"Which attribute provides alternative text for an image?", options:["title","src","alt","caption"], answer:2},
    {text:"Which element represents the main content of a page?", options:["<main>","<bodytext>","<content>","<section-main>"], answer:0},
    {text:"Which tag creates an ordered list?", options:["<ul>","<li>","<ol>","<list>"], answer:2},
    {text:"Which declaration tells the browser to use HTML5?", options:["<html version='5'>","<!DOCTYPE html>","<doctype=html5>","<html5>"], answer:1}
  ]},
  { id:"sample-css", title:"CSS Styling Essentials", topic:"CSS", description:"Explore selectors, layout, spacing and responsive styling.", time:4, source:"sample", questions:[
    {text:"Which property changes the text color?", options:["font-color","text-style","color","foreground"], answer:2},
    {text:"Which layout system is designed for one-dimensional layouts?", options:["Flexbox","Float only","Table layout","Position absolute"], answer:0},
    {text:"What does CSS stand for?", options:["Creative Style Sheets","Cascading Style Sheets","Computer Styled Sections","Colorful Style Syntax"], answer:1},
    {text:"Which unit is relative to the root element's font size?", options:["px","vh","rem","cm"], answer:2},
    {text:"Which property adds space inside an element's border?", options:["margin","padding","gap-outside","outline"], answer:1}
  ]},
  { id:"sample-js", title:"JavaScript Jumpstart", topic:"JavaScript", description:"Test your understanding of variables, arrays and functions.", time:5, source:"sample", questions:[
    {text:"Which keyword declares a block-scoped variable that can be reassigned?", options:["const","let","static","define"], answer:1},
    {text:"Which method adds an item to the end of an array?", options:["push()","pop()","shift()","slice()"], answer:0},
    {text:"What does typeof 42 return?", options:["number","integer","float","numeric"], answer:0},
    {text:"Which symbol is used for strict equality?", options:["=","==","===","!="], answer:2},
    {text:"Which method converts a JSON string into a JavaScript value?", options:["JSON.stringify()","JSON.parse()","JSON.convert()","JSON.read()"], answer:1}
  ]},
  { id:"sample-python", title:"Python Core Concepts", topic:"Python", description:"Practice Python syntax, collections and core language basics.", time:5, source:"sample", questions:[
    {text:"Which symbol starts a single-line comment in Python?", options:["//","#","<!--","**"], answer:1},
    {text:"Which data type stores key-value pairs?", options:["list","tuple","dictionary","set"], answer:2},
    {text:"What is the result of len([4, 8, 12])?", options:["2","3","4","12"], answer:1},
    {text:"Which keyword defines a function?", options:["function","func","def","lambda only"], answer:2},
    {text:"Which collection is immutable?", options:["list","dictionary","set","tuple"], answer:3}
  ]},
  { id:"sample-web", title:"Web Development Basics", topic:"Web Development", description:"A quick mix of frontend concepts and browser fundamentals.", time:4, source:"sample", questions:[
    {text:"Which language primarily defines the structure of a webpage?", options:["CSS","HTML","SQL","Python"], answer:1},
    {text:"What is the main purpose of CSS?", options:["Store data","Style and layout pages","Run database queries","Create server hardware"], answer:1},
    {text:"Which browser storage persists after a browser is closed?", options:["localStorage","A local variable","A function parameter","The call stack"], answer:0},
    {text:"What does responsive design help a website do?", options:["Load without HTML","Adapt to different screen sizes","Replace JavaScript","Guarantee internet access"], answer:1},
    {text:"Which protocol is commonly used to transfer web pages?", options:["HTTP","SMTP only","FTP only","SSH only"], answer:0}
  ]},
  { id:"sample-gk", title:"Everyday General Knowledge", topic:"General Knowledge", description:"Warm up with a few science, geography and number facts.", time:3, source:"sample", questions:[
    {text:"Which planet is known as the Red Planet?", options:["Venus","Mars","Jupiter","Mercury"], answer:1},
    {text:"How many sides does a hexagon have?", options:["5","6","7","8"], answer:1},
    {text:"Which gas do plants absorb during photosynthesis?", options:["Oxygen","Nitrogen","Carbon dioxide","Hydrogen"], answer:2},
    {text:"What is the largest ocean on Earth?", options:["Atlantic","Indian","Arctic","Pacific"], answer:3},
    {text:"Which instrument measures temperature?", options:["Barometer","Thermometer","Altimeter","Compass"], answer:1}
  ]}
];

function readStore(key, fallback = []) {
  try { const value = JSON.parse(localStorage.getItem(key)); return Array.isArray(value) ? value : fallback; }
  catch { return fallback; }
}
function saveStore(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
function getCustomQuizzes() { return readStore(STORAGE_KEYS.custom); }
function getAttempts() { return readStore(STORAGE_KEYS.attempts); }
function allQuizzes() { return [...sampleQuizzes, ...getCustomQuizzes()]; }
function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" })[char]);
}
function icon(name, extra = "") { return `<i data-lucide="${name}" ${extra}></i>`; }
function refreshIcons() { if (window.lucide) window.lucide.createIcons(); }
function topicClass(topic) {
  const map = {HTML:"peach",CSS:"blue",JavaScript:"lavender",Python:"mint","Web Development":"sky","General Knowledge":"rose"};
  return map[topic] || "lavender";
}
function topicIcon(topic) {
  const map = {HTML:"code-2",CSS:"palette",JavaScript:"braces",Python:"terminal","Web Development":"monitor-smartphone","General Knowledge":"brain"};
  return map[topic] || "book-open";
}
function formatDate(dateString) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "Recently";
  return date.toLocaleDateString(undefined, {month:"short", day:"numeric", year:"numeric"});
}
function toast(message, type = "success") {
  const node = document.createElement("div");
  node.className = `toast ${type === "error" ? "error" : ""}`;
  node.innerHTML = `${icon(type === "error" ? "alert-circle" : "check-circle")}<span>${escapeHTML(message)}</span>`;
  $("#toastRegion").append(node); refreshIcons();
  setTimeout(() => node.remove(), 3200);
}
function goTo(page) {
  if (timerId && page !== "quiz") stopTimer();
  currentPage = page;
  $$(".nav-item").forEach(button => button.classList.toggle("active", button.dataset.page === page || (page === "quiz" && button.dataset.page === "explore") || (page === "result" && button.dataset.page === "history")));
  const names = {dashboard:"Dashboard",explore:"Explore quizzes",myquizzes:"My quizzes",history:"My results",quiz:"Quiz in progress",result:"Quiz results"};
  $("#breadcrumbCurrent").textContent = names[page] || "Dashboard";
  $("#sidebar").classList.remove("open");
  renderPage();
}
function renderPage() {
  pageRoot.innerHTML = "";
  if (currentPage === "dashboard") renderDashboard();
  else if (currentPage === "explore") renderExplore();
  else if (currentPage === "myquizzes") renderMyQuizzes();
  else if (currentPage === "history") renderHistory();
  else if (currentPage === "quiz") renderQuiz();
  else if (currentPage === "result") renderResult();
  refreshIcons();
}
function quizCard(quiz, index = 0) {
  const custom = quiz.source === "custom";
  const count = quiz.questions.length;
  const description = quiz.description || `Practice ${quiz.topic} with a focused set of questions.`;
  return `<article class="quiz-card" style="animation-delay:${index * 45}ms">
    <div class="quiz-card-top"><div class="topic-icon ${topicClass(quiz.topic)}">${icon(topicIcon(quiz.topic))}</div><span class="tag ${custom ? "custom" : ""}">${custom ? "MY QUIZ" : "POPULAR"}</span></div>
    <h3>${escapeHTML(quiz.title)}</h3><p>${escapeHTML(description)}</p>
    <div class="quiz-meta"><span>${icon("list-checks")}${count} questions</span><span>${icon("clock-3")}${quiz.time} min</span><span>${icon("layers-3")}${escapeHTML(quiz.topic)}</span></div>
    <div class="quiz-card-footer"><span class="tag">${custom ? "Created by you" : "Quick practice"}</span><button class="link-button" data-action="start" data-id="${escapeHTML(quiz.id)}">Start quiz ${icon("arrow-up-right")}</button></div>
  </article>`;
}
function emptyState(title, message, buttonText, action) {
  return `<div class="empty-state">${icon("notebook-pen")}<h3>${escapeHTML(title)}</h3><p>${escapeHTML(message)}</p><button class="primary-button" data-action="${action}">${icon("plus")}${escapeHTML(buttonText)}</button></div>`;
}
function renderDashboard() {
  const attempts = getAttempts();
  const custom = getCustomQuizzes();
  const average = attempts.length ? Math.round(attempts.reduce((sum, a) => sum + a.accuracy, 0) / attempts.length) : 0;
  const totalCorrect = attempts.reduce((sum, a) => sum + a.correct, 0);
  const featured = [sampleQuizzes[0], sampleQuizzes[2], sampleQuizzes[3]];
  const recent = attempts.slice().reverse().slice(0,3);
  pageRoot.innerHTML = `
    <div class="welcome-row"><div><span class="eyebrow">TUESDAY, OCTOBER 13</span><h1>Make today a little smarter <span aria-hidden="true">✦</span></h1><p>Welcome back! <strong>Your next breakthrough starts with one question.</strong></p></div><button class="primary-button" data-action="create">${icon("plus")} Build a quiz</button></div>
    <section class="hero-card"><div class="hero-copy"><span class="pill">${icon("sparkles")} YOUR LEARNING SPACE</span><h2>Curiosity is your superpower. Put it to the test.</h2><p>Explore bite-sized quizzes, challenge yourself, and watch your confidence grow one answer at a time.</p><button class="primary-button" data-page="explore">Explore quizzes ${icon("arrow-right")}</button></div><div class="hero-art" aria-hidden="true"><div class="art-circle">${icon("graduation-cap")}</div><div class="floating-note note-top">${icon("trophy")} Keep improving</div><div class="floating-note note-bottom">${icon("sparkles")} One step at a time</div></div></section>
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-icon purple">${icon("book-open-check")}</div><div class="stat-copy"><span>Quizzes available</span><strong>${sampleQuizzes.length + custom.length}</strong><small>Ready to try</small></div></div>
      <div class="stat-card"><div class="stat-icon blue">${icon("check-check")}</div><div class="stat-copy"><span>Quizzes completed</span><strong>${attempts.length}</strong><small>${attempts.length ? "Nice consistency" : "Your journey starts here"}</small></div></div>
      <div class="stat-card"><div class="stat-icon mint">${icon("target")}</div><div class="stat-copy"><span>Average accuracy</span><strong>${average}%</strong><small>${attempts.length ? "Across attempts" : "No attempts yet"}</small></div></div>
      <div class="stat-card"><div class="stat-icon peach">${icon("check-circle-2")}</div><div class="stat-copy"><span>Correct answers</span><strong>${totalCorrect}</strong><small>Knowledge collected</small></div></div>
    </div>
    <div class="section-heading"><div><h2>Pick up a new skill</h2><p>A few good places to start today.</p></div><button class="link-button" data-page="explore">View all quizzes ${icon("arrow-right")}</button></div>
    <div class="quiz-grid">${featured.map((quiz,i)=>quizCard(quiz,i)).join("")}</div>
    <div class="section-heading"><div><h2>Recently attempted</h2><p>Your learning journey, one quiz at a time.</p></div><button class="link-button" data-page="history">See history ${icon("arrow-right")}</button></div>
    ${recent.length ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>Quiz</th><th>Date</th><th>Score</th><th>Accuracy</th></tr></thead><tbody>${recent.map(a=>`<tr><td>${escapeHTML(a.title)}</td><td>${formatDate(a.date)}</td><td>${a.correct}/${a.total}</td><td><span class="result-score">${a.accuracy}%</span></td></tr>`).join("")}</tbody></table></div>` : `<div class="empty-state">${icon("chart-no-axes-column")}<h3>Your progress will appear here</h3><p>Finish a quiz to see your first result and track your improvement.</p><button class="primary-button" data-page="explore">Take your first quiz ${icon("arrow-right")}</button></div>`}`;
}
function renderExplore() {
  const quizzes = allQuizzes().filter(q => (exploreFilter === "All topics" || q.topic === exploreFilter) && `${q.title} ${q.topic} ${q.description}`.toLowerCase().includes(searchTerm.toLowerCase()));
  const topics = ["All topics", ...new Set(allQuizzes().map(q=>q.topic))];
  pageRoot.innerHTML = `<div class="page-title"><span class="eyebrow">DISCOVER SOMETHING NEW</span><h1>Explore quizzes</h1><p>Choose a topic, test what you know, and find your next learning win.</p></div>
    <div class="toolbar"><label class="search-box">${icon("search")}<input id="quizSearch" type="search" value="${escapeHTML(searchTerm)}" placeholder="Search quizzes or topics..." aria-label="Search quizzes"></label><select class="filter-select" id="topicFilter" aria-label="Filter by topic">${topics.map(t=>`<option ${t===exploreFilter?"selected":""}>${escapeHTML(t)}</option>`).join("")}</select></div>
    <div class="section-heading"><div><h2>${quizzes.length} quizzes to explore</h2><p>Short sessions. Useful progress.</p></div><button class="secondary-button" data-action="create">${icon("plus")} Create your own</button></div>
    <div class="quiz-grid" id="exploreGrid">${quizzes.length ? quizzes.map((q,i)=>quizCard(q,i)).join("") : emptyState("No quizzes found","Try another search or choose a different topic.","Clear filters","clear-filters")}</div>`;
  $("#quizSearch").addEventListener("input", e=>{searchTerm=e.target.value; renderExploreKeepFocus(e.target.selectionStart);});
  $("#topicFilter").addEventListener("change", e=>{exploreFilter=e.target.value;renderExplore();});
}
function renderExploreKeepFocus(position) {
  const input = $("#quizSearch");
  const old = input ? input.value : searchTerm;
  renderExplore();
  const next = $("#quizSearch"); next.focus(); next.setSelectionRange(position,position);
  if (next.value !== old) next.value = old;
}
function renderMyQuizzes() {
  const quizzes = getCustomQuizzes().filter(q => `${q.title} ${q.topic}`.toLowerCase().includes(searchTerm.toLowerCase()));
  pageRoot.innerHTML = `<div class="page-title"><span class="eyebrow">YOUR CREATIONS</span><h1>My quizzes</h1><p>Make a quiz around anything you're learning, then take it whenever you want.</p></div>
    <div class="toolbar"><label class="search-box">${icon("search")}<input id="myQuizSearch" type="search" value="${escapeHTML(searchTerm)}" placeholder="Search your quizzes..." aria-label="Search your quizzes"></label><button class="primary-button" data-action="create">${icon("plus")} Create quiz</button></div>
    ${quizzes.length ? `<div class="quiz-grid">${quizzes.map((q,i)=>quizCard({...q,source:"custom"},i)).join("")}</div>` : emptyState("Your quiz library starts here","Create your first quiz with your own questions and answer key.","Create your first quiz","create")}`;
  const input = $("#myQuizSearch");
  if (input) input.addEventListener("input",e=>{searchTerm=e.target.value; const pos=e.target.selectionStart; renderMyQuizzes(); const next=$("#myQuizSearch");next.focus();next.setSelectionRange(pos,pos);});
  if (quizzes.length) {
    pageRoot.insertAdjacentHTML("beforeend", `<div class="section-heading"><div><h2>Manage your quizzes</h2><p>Delete a quiz whenever you no longer need it.</p></div></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Quiz</th><th>Topic</th><th>Questions</th><th>Time</th><th>Actions</th></tr></thead><tbody>${quizzes.map(q=>`<tr><td>${escapeHTML(q.title)}</td><td>${escapeHTML(q.topic)}</td><td>${q.questions.length}</td><td>${q.time} min</td><td><div class="table-actions"><button class="mini-button" data-action="start" data-id="${escapeHTML(q.id)}">${icon("play")} Attempt</button><button class="mini-button danger-button" data-action="delete" data-id="${escapeHTML(q.id)}">${icon("trash-2")} Delete</button></div></td></tr>`).join("")}</tbody></table></div>`);
  }
  refreshIcons();
}
function renderHistory() {
  const attempts = getAttempts().slice().reverse();
  const avg = attempts.length ? Math.round(attempts.reduce((s,a)=>s+a.accuracy,0)/attempts.length) : 0;
  pageRoot.innerHTML = `<div class="page-title"><span class="eyebrow">YOUR PROGRESS</span><h1>My results</h1><p>Review your attempts, celebrate your wins, and spot what to practice next.</p></div>
    <div class="stats-grid"><div class="stat-card"><div class="stat-icon purple">${icon("clipboard-check")}</div><div class="stat-copy"><span>Total attempts</span><strong>${attempts.length}</strong></div></div><div class="stat-card"><div class="stat-icon mint">${icon("target")}</div><div class="stat-copy"><span>Average accuracy</span><strong>${avg}%</strong></div></div><div class="stat-card"><div class="stat-icon blue">${icon("check-check")}</div><div class="stat-copy"><span>Answers correct</span><strong>${attempts.reduce((s,a)=>s+a.correct,0)}</strong></div></div><div class="stat-card"><div class="stat-icon peach">${icon("clock-3")}</div><div class="stat-copy"><span>Time well spent</span><strong>${attempts.reduce((s,a)=>s+(a.duration||0),0)}<small> min</small></strong></div></div></div>
    ${attempts.length ? `<div class="section-heading"><div><h2>Attempt history</h2><p>Select review to revisit the questions and explanations.</p></div><button class="secondary-button" data-action="clear-history">${icon("trash-2")} Clear history</button></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Quiz</th><th>Topic</th><th>Date</th><th>Score</th><th>Accuracy</th><th>Action</th></tr></thead><tbody>${attempts.map(a=>`<tr><td>${escapeHTML(a.title)}</td><td>${escapeHTML(a.topic)}</td><td>${formatDate(a.date)}</td><td>${a.correct}/${a.total}</td><td><span class="result-score">${a.accuracy}%</span></td><td><button class="mini-button" data-action="review-attempt" data-id="${escapeHTML(a.id)}">${icon("eye")} Review</button></td></tr>`).join("")}</tbody></table></div>` : emptyState("No results just yet","Your completed quizzes will appear here with scores and accuracy.","Explore quizzes","explore")}`;
}
function startQuiz(id) {
  const quiz = allQuizzes().find(q=>q.id===id);
  if (!quiz || !quiz.questions.length) { toast("This quiz could not be found.", "error"); return; }
  activeQuiz = JSON.parse(JSON.stringify(quiz));
  activeQuestionIndex = 0; selectedAnswers = {};
  secondsLeft = Math.max(1, Number(quiz.time) || 5) * 60;
  goTo("quiz"); startTimer();
}
function startTimer() {
  stopTimer();
  timerId = setInterval(() => {
    secondsLeft--;
    const timer = $("#timerDisplay");
    if (timer) { timer.textContent = formatTime(secondsLeft); timer.classList.toggle("urgent", secondsLeft <= 30); }
    if (secondsLeft <= 0) { stopTimer(); finishQuiz(true); }
  }, 1000);
}
function stopTimer() { if (timerId) { clearInterval(timerId); timerId = null; } }
function formatTime(seconds) { return `${Math.floor(Math.max(0,seconds)/60).toString().padStart(2,"0")}:${(Math.max(0,seconds)%60).toString().padStart(2,"0")}`; }
function renderQuiz() {
  if (!activeQuiz) { currentPage="explore";renderExplore();return; }
  const question = activeQuiz.questions[activeQuestionIndex];
  const total = activeQuiz.questions.length;
  const answered = Object.keys(selectedAnswers).length;
  pageRoot.innerHTML = `<div class="page-title"><span class="eyebrow">FOCUS MODE</span><h1>One question at a time.</h1><p>Take your time, trust what you've learned, and keep moving forward.</p></div>
    <div class="quiz-intro"><div class="topic-icon ${topicClass(activeQuiz.topic)}">${icon(topicIcon(activeQuiz.topic))}</div><div><h2>${escapeHTML(activeQuiz.title)}</h2><p>${escapeHTML(activeQuiz.description || `A focused ${activeQuiz.topic} quiz.`)} · ${total} questions</p></div></div>
    <div class="quiz-run-layout"><section class="question-panel"><div class="question-topline"><span class="question-count">QUESTION ${activeQuestionIndex+1} <span style="color:#c2c3d2">/ ${total}</span></span><span class="timer-chip" id="timerDisplay">${icon("clock-3")}${formatTime(secondsLeft)}</span></div><div class="progress-track"><div class="progress-fill" style="width:${((activeQuestionIndex+1)/total)*100}%"></div></div>
      <h2>${escapeHTML(question.text)}</h2><div class="answer-list">${question.options.map((option,i)=>`<button class="answer-option ${selectedAnswers[activeQuestionIndex]===i?"selected":""}" data-action="answer" data-answer="${i}"><span class="option-letter">${String.fromCharCode(65+i)}</span><span class="option-text">${escapeHTML(option)}</span></button>`).join("")}</div>
      <div class="question-actions"><button class="secondary-button" data-action="previous" ${activeQuestionIndex===0?"disabled":""}>${icon("arrow-left")} Previous</button><span class="question-count">${answered} of ${total} answered</span>${activeQuestionIndex===total-1?`<button class="primary-button" data-action="submit-quiz">${icon("check")} Finish quiz</button>`:`<button class="primary-button" data-action="next">Next question ${icon("arrow-right")}</button>`}</div>
    </section><aside class="quiz-side-panel"><h3>Question navigator</h3><p>Jump to any question. Your answers are saved as you go.</p><div class="question-numbers">${activeQuiz.questions.map((q,i)=>`<button class="question-number ${i===activeQuestionIndex?"current":""} ${selectedAnswers[i]!==undefined?"answered":""}" data-action="jump" data-index="${i}" aria-label="Go to question ${i+1}">${i+1}</button>`).join("")}</div><div class="legend"><span><i class="legend-dot"></i> Current question</span><span><i class="legend-dot answered"></i> Answered</span><span><i class="legend-dot unanswered"></i> Not answered</span></div><button class="secondary-button" style="width:100%;margin-top:20px" data-action="submit-quiz">${icon("flag")} Submit quiz</button></aside></div>`;
  refreshIcons();
}
function finishQuiz(timeExpired = false) {
  if (!activeQuiz) return;
  const unanswered = activeQuiz.questions.length - Object.keys(selectedAnswers).length;
  if (!timeExpired && unanswered > 0 && !confirm(`You have ${unanswered} unanswered question${unanswered===1?"":"s"}. Submit anyway?`)) return;
  stopTimer();
  const correct = activeQuiz.questions.reduce((sum,q,i)=>sum+(selectedAnswers[i]===q.answer?1:0),0);
  const total = activeQuiz.questions.length;
  const attempt = {
    id:`attempt-${Date.now()}`, quizId:activeQuiz.id, title:activeQuiz.title, topic:activeQuiz.topic,
    date:new Date().toISOString(), correct, total, accuracy:Math.round(correct/total*100),
    duration:Math.max(0,Math.ceil((Number(activeQuiz.time)*60-secondsLeft)/60)),
    answers:{...selectedAnswers}, questions:JSON.parse(JSON.stringify(activeQuiz.questions)), timeExpired
  };
  const attempts = getAttempts(); attempts.push(attempt); saveStore(STORAGE_KEYS.attempts,attempts);
  lastResult = attempt; currentPage="result"; goTo("result");
  if (timeExpired) toast("Time is up. Your quiz was submitted automatically.");
}
function renderResult(attempt = lastResult) {
  if (!attempt) { currentPage="history";renderHistory();return; }
  lastResult = attempt;
  const angle = attempt.accuracy * 3.6;
  const wrong = attempt.total - attempt.correct;
  const topicStats = {};
  attempt.questions.forEach((q,i)=>{ const key=q.topic || attempt.topic; if(!topicStats[key])topicStats[key]={correct:0,total:0};topicStats[key].total++;if(attempt.answers[i]===q.answer)topicStats[key].correct++; });
  const feedback = attempt.accuracy===100 ? "Perfect score — you understood every question!" : attempt.accuracy>=80 ? "Excellent work! You're building strong understanding." : attempt.accuracy>=60 ? "Good progress! Review the missed answers to level up." : "Every attempt is practice. Review your answers and try again.";
  pageRoot.innerHTML = `<section class="results-hero"><div class="result-medal">${icon(attempt.accuracy>=80?"trophy":"graduation-cap")}</div><span class="eyebrow">QUIZ COMPLETED</span><h1>${attempt.accuracy>=80?"Beautiful work!":"You showed up. That counts!"}</h1><p>${escapeHTML(feedback)}</p><div class="score-ring" style="--score-angle:${angle}deg"><div class="score-ring-content"><strong>${attempt.accuracy}%</strong><span>accuracy</span></div></div><p style="margin-top:14px">${attempt.correct} of ${attempt.total} answers correct · ${escapeHTML(attempt.title)}</p></section>
    <div class="result-stats"><div class="result-stat"><span>${icon("check-circle-2")} Correct answers</span><strong style="color:#40a582">${attempt.correct}</strong></div><div class="result-stat"><span>${icon("x-circle")} Incorrect / skipped</span><strong style="color:#dc8190">${wrong}</strong></div><div class="result-stat"><span>${icon("clock-3")} Time spent</span><strong>${attempt.duration||0}<small style="font-size:11px;color:#8d91a9"> min</small></strong></div></div>
    <div class="result-columns"><section class="result-panel"><h3>Topic-wise performance</h3>${Object.entries(topicStats).map(([topic,s])=>`<div class="topic-row"><span>${escapeHTML(topic)}</span><div class="topic-track"><div class="topic-fill" style="width:${Math.round(s.correct/s.total*100)}%"></div></div><strong>${Math.round(s.correct/s.total*100)}%</strong></div>`).join("")}<p style="font-size:10px;color:#9295ac;margin:20px 0 0">Use these results to decide what to practice next.</p></section><section class="result-panel"><h3>Answer review</h3><div class="review-list">${attempt.questions.map((q,i)=>{const picked=attempt.answers[i];const isCorrect=picked===q.answer;return `<article class="review-item"><h4>${i+1}. ${escapeHTML(q.text)}</h4><div class="review-answer ${isCorrect?"correct":"wrong"}">${icon(isCorrect?"check-circle-2":"x-circle")}<span>Your answer: ${picked===undefined?"Not answered":escapeHTML(q.options[picked])}</span></div>${!isCorrect?`<div class="review-answer correct">${icon("check-circle")}<span>Correct answer: ${escapeHTML(q.options[q.answer])}</span></div>`:""}</article>`;}).join("")}</div></section></div>
    <div class="result-footer"><button class="secondary-button" data-page="history">${icon("chart-no-axes-column")} View all results</button><button class="secondary-button" data-action="retry" data-id="${escapeHTML(attempt.quizId)}">${icon("rotate-ccw")} Try again</button><button class="primary-button" data-page="explore">Explore more quizzes ${icon("arrow-right")}</button></div>`;
  refreshIcons();
}
function openModal() {
  $("#quizForm").reset();
  $("#quizTime").value="5";
  $("#questionBuilder").innerHTML="";
  builderCount=0; addBuilderQuestion();
  $("#modalBackdrop").classList.remove("hidden");
  document.body.style.overflow="hidden";
  setTimeout(()=>$("#quizTitle").focus(),50);
  refreshIcons();
}
function closeModal() { $("#modalBackdrop").classList.add("hidden");document.body.style.overflow=""; }
function addBuilderQuestion() {
  builderCount++;
  const n=builderCount;
  const div=document.createElement("div");div.className="builder-question";div.dataset.questionNumber=n;
  div.innerHTML=`<div class="builder-question-head"><strong>Question ${n}</strong><button type="button" data-action="remove-builder-question" aria-label="Remove question ${n}" title="Remove question">${icon("trash-2")}</button></div>
    <input type="text" class="builder-question-text" maxlength="220" required placeholder="Write your question here..." aria-label="Question ${n} text">
    <div class="option-editor">${[0,1,2,3].map(i=>`<label><input type="radio" name="correct-${n}" value="${i}" ${i===0?"checked":""} aria-label="Mark option ${String.fromCharCode(65+i)} correct"><input type="text" class="builder-option" maxlength="150" required placeholder="Option ${String.fromCharCode(65+i)}" aria-label="Option ${String.fromCharCode(65+i)}"></label>`).join("")}</div>`;
  $("#questionBuilder").append(div); updateBuilderCount(); refreshIcons();
}
function updateBuilderCount() {
  const count=$$(".builder-question").length;
  $("#questionCount").textContent=`${count} question${count===1?"":"s"}`;
  $$(".builder-question").forEach((node,i)=>{const label=$("strong",node);if(label)label.textContent=`Question ${i+1}`;});
}
function saveQuizFromForm(event) {
  event.preventDefault();
  const title=$("#quizTitle").value.trim();
  if(!title){toast("Please add a quiz title.","error");return;}
  const builderQuestions=$$(".builder-question");
  if(!builderQuestions.length){toast("Add at least one question.","error");return;}
  const questions=[];
  for(let i=0;i<builderQuestions.length;i++){
    const node=builderQuestions[i];
    const text=$(".builder-question-text",node).value.trim();
    const options=$$(".builder-option",node).map(input=>input.value.trim());
    const checked=$(`input[name="correct-${node.dataset.questionNumber}"]:checked`,node);
    if(!text||options.some(option=>!option)){toast(`Complete the question and all four options for Question ${i+1}.`,"error");return;}
    if(new Set(options.map(o=>o.toLowerCase())).size!==4){toast(`Question ${i+1} needs four different options.`,"error");return;}
    questions.push({text,options,answer:checked?Number(checked.value):0});
  }
  const quiz={id:`custom-${Date.now()}`,title,topic:$("#quizTopic").value,time:Number($("#quizTime").value),description:$("#quizDescription").value.trim(),source:"custom",createdAt:new Date().toISOString(),questions};
  const custom=getCustomQuizzes();custom.push(quiz);saveStore(STORAGE_KEYS.custom,custom);
  closeModal();searchTerm="";goTo("myquizzes");toast("Your quiz was saved. Ready when you are!");
}
function deleteQuiz(id) {
  const quiz=getCustomQuizzes().find(q=>q.id===id);
  if(!quiz)return;
  if(!confirm(`Delete "${quiz.title}"? This cannot be undone.`))return;
  saveStore(STORAGE_KEYS.custom,getCustomQuizzes().filter(q=>q.id!==id));
  toast("Quiz deleted.");renderMyQuizzes();refreshIcons();
}
function reviewAttempt(id) {
  const attempt=getAttempts().find(a=>a.id===id);
  if(!attempt)return;
  stopTimer();lastResult=attempt;goTo("result");
}

document.addEventListener("click", event => {
  const pageButton=event.target.closest("[data-page]");
  const actionButton=event.target.closest("[data-action]");
  if(pageButton){event.preventDefault();const page=pageButton.dataset.page;if(page==="explore"||page==="myquizzes"||page==="history"||page==="dashboard"){searchTerm="";goTo(page);} }
  if(!actionButton)return;
  const action=actionButton.dataset.action;
  if(action==="create")openModal();
  else if(action==="start")startQuiz(actionButton.dataset.id);
  else if(action==="answer"){selectedAnswers[activeQuestionIndex]=Number(actionButton.dataset.answer);renderQuiz();}
  else if(action==="next"){if(activeQuestionIndex<activeQuiz.questions.length-1)activeQuestionIndex++;renderQuiz();}
  else if(action==="previous"){if(activeQuestionIndex>0)activeQuestionIndex--;renderQuiz();}
  else if(action==="jump"){activeQuestionIndex=Number(actionButton.dataset.index);renderQuiz();}
  else if(action==="submit-quiz")finishQuiz(false);
  else if(action==="delete")deleteQuiz(actionButton.dataset.id);
  else if(action==="retry")startQuiz(actionButton.dataset.id);
  else if(action==="review-attempt")reviewAttempt(actionButton.dataset.id);
  else if(action==="clear-history"){if(confirm("Clear all saved quiz results? Your quizzes will not be deleted.")){saveStore(STORAGE_KEYS.attempts,[]);toast("Result history cleared.");renderHistory();}}
  else if(action==="clear-filters"){searchTerm="";exploreFilter="All topics";renderExplore();}
  else if(action==="explore")goTo("explore");
  else if(action==="remove-builder-question"){if($$(".builder-question").length===1){toast("Keep at least one question in your quiz.","error");return;}actionButton.closest(".builder-question").remove();updateBuilderCount();}
});
$("#quizForm").addEventListener("submit",saveQuizFromForm);
$("#addQuestion").addEventListener("click",addBuilderQuestion);
$("#closeModal").addEventListener("click",closeModal);
$("#cancelModal").addEventListener("click",closeModal);
$("#modalBackdrop").addEventListener("click",e=>{if(e.target.id==="modalBackdrop")closeModal();});
$("#menuToggle").addEventListener("click",()=>$("#sidebar").classList.toggle("open"));
$("#helpButton").addEventListener("click",()=>alert("QuizCraft is a browser-based quiz builder and practice app. Your custom quizzes and results are stored locally in this browser. This demo does not use a server or account system."));
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!$("#modalBackdrop").classList.contains("hidden"))closeModal();});
$("#todayLabel").textContent=new Date().toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"});
renderDashboard();
