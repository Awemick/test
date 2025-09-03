// script.js - Main application file with all integrations
import { supabase } from './supabase.js'

// API Keys (In production, these should be stored securely)
const OCR_SPACE_API_KEY = 'K85308176588957';
const HUGGING_FACE_API_KEY = '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';
const PAYSTACK_PUBLIC_KEY = 'pk_test_c8085f6e5ec5f58ab4146937afe3daf700003bfe';

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
  initializeApp();
});

async function initializeApp() {
  // Check authentication state
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // User signed in
        updateUIForAuthenticatedUser();
      } else if (event === 'SIGNED_OUT') {
        // User signed out
        updateUIForAnonymousUser();
      }
    }
  );
  
  // Check current auth status
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    updateUIForAuthenticatedUser();
  } else {
    updateUIForAnonymousUser();
  }
  
  // Set up event listeners
  setupEventListeners();
}

function setupEventListeners() {
  // Auth button
  document.getElementById('authBtn').addEventListener('click', handleAuthClick);
  
  // File uploads
  const fileInput = document.getElementById('fileUpload');
  const imageInput = document.getElementById('imageUpload');
  
  if (fileInput) {
    fileInput.addEventListener('change', handleFileUpload);
  }
  
  if (imageInput) {
    imageInput.addEventListener('change', handleImageUpload);
  }
  
  // Upload area click handlers
  const uploadArea = document.getElementById('uploadArea');
  const imageUploadArea = document.getElementById('imageUploadArea');
  
  if (uploadArea) {
    uploadArea.addEventListener('click', () => document.getElementById('fileUpload').click());
  }
  
  if (imageUploadArea) {
    imageUploadArea.addEventListener('click', () => document.getElementById('imageUpload').click());
  }
  
  // Process file button
  const processFileBtn = document.getElementById('processFileBtn');
  if (processFileBtn) {
    processFileBtn.addEventListener('click', processUploadedFile);
  }
  
  // Extract text button
  const extractTextBtn = document.getElementById('extractTextBtn');
  if (extractTextBtn) {
    extractTextBtn.addEventListener('click', extractTextFromImage);
  }
  
  // Record button
  const recordBtn = document.getElementById('recordBtn');
  if (recordBtn) {
    recordBtn.addEventListener('click', handleRecordClick);
  }
  
  // Generate flashcards button
  const generateBtn = document.getElementById('generateBtn');
  if (generateBtn) {
    generateBtn.addEventListener('click', handleGenerateFlashcards);
  }
  
  // Save transcript button
  const saveTranscriptBtn = document.getElementById('saveTranscriptBtn');
  if (saveTranscriptBtn) {
    saveTranscriptBtn.addEventListener('click', saveTranscript);
  }
  
  // Premium upgrade buttons
  document.querySelectorAll('.plan-btn').forEach(btn => {
    btn.addEventListener('click', async (event) => {
      event.preventDefault();
      const planType = event.target.dataset.plan;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('Please sign in to upgrade to premium.');
        showAuthModal();
        return;
      }
      try {
        await handlePremiumUpgradePayment(user.id, planType);
      } catch (error) {
        console.error('Premium upgrade error:', error);
        alert('Failed to initialize payment. Please try again.');
      }
    });
  });
  
  // Payment modal button
  const paymentButton = document.getElementById('intaSendButton');
  if (paymentButton) {
    paymentButton.addEventListener('click', handlePayment);
  }
  
  // Tab navigation
  const tabLinks = document.querySelectorAll('.nav-link');
  tabLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      const tabName = this.dataset.tab;
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
      document.getElementById(`${tabName}-tab`).classList.add('active');

      // Load data for each tab
      if (tabName === 'study') loadStudySets();
      if (tabName === 'library') loadLibrary();
      if (tabName === 'stats' || tabName === 'analytics') loadAnalytics();
    });
  });
  
  // Hero section buttons
  const startLearningBtn = document.querySelector('.cta-primary');
  const watchDemoBtn = document.querySelector('.cta-secondary');
  
  if (startLearningBtn) {
    startLearningBtn.addEventListener('click', () => {
      document.getElementById('generate-tab').scrollIntoView({ behavior: 'smooth' });
    });
  }
  
  if (watchDemoBtn) {
    watchDemoBtn.addEventListener('click', () => {
      alert('Demo video would play here in the full version.');
    });
  }
}

async function handleAuthClick() {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (user) {
    // User is logged in, show profile menu or log out
    const { error } = await supabase.auth.signOut();
    if (error) console.error('Error signing out:', error);
  } else {
    // User is not logged in, show auth modal
    showAuthModal();
  }
}

async function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  // Show file preview
  document.getElementById('fileName').textContent = file.name;
  document.getElementById('filePreview').classList.remove('hidden');
}

async function processUploadedFile() {
  const fileInput = document.getElementById('fileUpload');
  const file = fileInput.files[0];

  if (!file) {
    alert('Please select a file first.');
    return;
  }

  // Only allow text files
  if (!file.type.startsWith('text/')) {
    alert('Only plain text files are supported for direct reading.');
    return;
  }

  try {
    const text = await readFileAsText(file);
    document.querySelector('.notes-input').value = text;
  } catch (error) {
    console.error('Error reading file:', error);
    alert('Failed to read file. Please try again.');
  }
}

async function handleImageUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  // Show image preview
  const previewImage = document.getElementById('previewImage');
  previewImage.src = URL.createObjectURL(file);
  document.getElementById('imagePreview').classList.remove('hidden');
}

async function extractTextFromImage() {
  const imageInput = document.getElementById('imageUpload');
  const file = imageInput.files[0];
  
  if (!file) {
    alert('Please select an image first.');
    return;
  }
  
  try {
    showLoading('Extracting text from image...');
    const text = await extractTextFromImageOCR(file);
    document.querySelector('.notes-input').value = text;
    hideLoading();
  } catch (error) {
    console.error('Error extracting text:', error);
    hideLoading();
    alert('Failed to extract text from image. Please try again.');
  }
}

async function handleRecordClick() {
  const recordBtn = document.getElementById('recordBtn');
  const recordingStatus = document.querySelector('.recording-status');
  const voiceActions = document.querySelector('.voice-actions');
  
  recordBtn.classList.toggle('recording');
  
  if (recordBtn.classList.contains('recording')) {
    recordBtn.innerHTML = '<i class="ri-stop-fill"></i> Stop Recording';
    if (recordingStatus) recordingStatus.classList.remove('hidden');
    if (voiceActions) voiceActions.classList.remove('hidden');
    
    // Simulate transcription
    setTimeout(() => {
      const transcriptPreview = document.getElementById('transcriptPreview');
      if (transcriptPreview) {
        transcriptPreview.textContent = "This is a simulated transcript of your voice recording. In the full version, this would be actual speech-to-text transcription.";
      }
    }, 2000);
  } else {
    recordBtn.innerHTML = '<i class="ri-mic-fill"></i> Start Recording';
    if (recordingStatus) recordingStatus.classList.add('hidden');
  }
}

async function saveTranscript() {
  const transcript = document.getElementById('transcriptPreview').textContent;
  document.querySelector('.notes-input').value = transcript;
}

async function handleGenerateFlashcards() {
  const inputText = document.querySelector('.notes-input').value;
  if (!inputText.trim()) {
    alert('Please enter some text or upload content first.');
    return;
  }
  
  try {
    showLoading('Generating flashcards...');
    
    // Generate flashcards using AI
    const flashcards = await generateFlashcardsAI(inputText);
    
    // Display flashcards
    displayFlashcards(flashcards);
    
    hideLoading();
  } catch (error) {
    console.error('Error generating flashcards:', error);
    hideLoading();
    alert('Failed to generate flashcards. Please try again.');
  }
}

async function generateFlashcardsAI(text) {
  try {
    const response = await fetch(
      'https://api-inference.huggingface.co/models/google/flan-t5-large',
      {
        headers: { Authorization: `Bearer ${HUGGING_FACE_API_KEY}` },
        method: 'POST',
        body: JSON.stringify({
          inputs: `Generate 5 multiple-choice flashcards from the following text. Format as JSON: [{"question": "...", "options": ["A", "B", "C", "D"], "answer": "A"}]. Text: ${text.substring(0, 1000)}`
        }),
      }
    );
    const result = await response.json();

    if (result.error) throw new Error(result.error);

    // Extract JSON from response
    const jsonMatch = result[0].generated_text.match(/\[.*\]/s);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    // Fallback to simple generation
    return generateSimpleMCFlashcards(text);
  } catch (error) {
    console.error('Hugging Face API Error:', error);
    return generateSimpleMCFlashcards(text);
  }
}

// Simple fallback for multiple-choice flashcards
function generateSimpleMCFlashcards(text) {
  const sentences = text.split(/[.!?]/).filter(s => s.length > 10);
  const flashcards = [];
  for (let i = 0; i < Math.min(sentences.length, 5); i++) {
    const sentence = sentences[i].trim();
    if (sentence.length < 15) continue;
    const words = sentence.split(' ');
    if (words.length < 4) continue;
    const keyTermIndex = Math.floor(words.length / 2);
    const keyTerm = words[keyTermIndex];
    words[keyTermIndex] = '______';
    // Generate 4 options (random words, one correct)
    const options = [
      keyTerm,
      words[1],
      words[2],
      words[3]
    ].sort(() => Math.random() - 0.5);
    flashcards.push({
      question: words.join(' ') + '?',
      options,
      answer: keyTerm
    });
  }
  return flashcards;
}

// Display flashcards with options
function displayFlashcards(flashcards) {
  const flashcardsGrid = document.getElementById('flashcardsGrid');
  if (!flashcardsGrid) return;
  flashcardsGrid.innerHTML = '';
  flashcards.forEach((card, index) => {
    const optionsHtml = card.options
      ? card.options.map((opt, i) =>
          `<button class="option-btn" data-correct="${opt === card.answer}">${String.fromCharCode(65 + i)}. ${opt}</button>`
        ).join('')
      : '';
    const cardElement = document.createElement('div');
    cardElement.className = 'flashcard';
    cardElement.innerHTML = `
      <div class="flashcard-content">
        <h4>Card ${index + 1}</h4>
        <p><strong>Q:</strong> ${card.question}</p>
        <div class="options">${optionsHtml}</div>
        <p class="answer" style="display:none;"><strong>Correct:</strong> ${card.answer}</p>
      </div>
    `;
    // Option click handler
    cardElement.querySelectorAll('.option-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        cardElement.querySelector('.answer').style.display = 'block';
        btn.classList.add(btn.dataset.correct === "true" ? 'correct' : 'incorrect');
      });
    });
    flashcardsGrid.appendChild(cardElement);
  });
  document.getElementById('resultsSection').classList.remove('hidden');
}

async function handlePremiumUpgrade(event) {
  event.preventDefault();
  
  // Check if user is authenticated
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    alert('Please sign in to upgrade to premium.');
    showAuthModal();
    return;
  }
  
  const planType = event.target.closest('.pricing-card').classList.contains('premium') ? 'monthly' : 'yearly';
  
  try {
    await handlePremiumUpgradePayment(user.id, planType);
  } catch (error) {
    console.error('Premium upgrade error:', error);
    alert('Failed to initialize payment. Please try again.');
  }
}

async function handlePayment() {
  // This would be called from the premium modal
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    alert('Please sign in to upgrade to premium.');
    showAuthModal();
    return;
  }
  
  try {
    await handlePremiumUpgradePayment(user.id, 'monthly');
  } catch (error) {
    console.error('Payment error:', error);
    alert('Failed to initialize payment. Please try again.');
  }
}

// Analytics loading function
async function loadAnalytics() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: sets } = await supabase
    .from('study_sets')
    .select('*')
    .eq('user_id', user.id);

  const totalSets = sets ? sets.length : 0;
  const subjects = sets ? [...new Set(sets.map(s => s.subject))] : [];
  let totalCards = 0;
  if (sets && sets.length > 0) {
    const setIds = sets.map(set => set.id);
    const { data: flashcards } = await supabase
      .from('flashcards')
      .select('*')
      .in('study_set_id', setIds);
    totalCards = flashcards ? flashcards.length : 0;
  }
  const studyTime = Math.floor(Math.random() * 120); // Simulated
  const streak = Math.floor(Math.random() * 7); // Simulated

  document.getElementById('analyticsSummary').innerHTML = `
    <ul>
      <li><strong>Total Study Sets:</strong> ${totalSets}</li>
      <li><strong>Total Flashcards:</strong> ${totalCards}</li>
      <li><strong>Subjects Studied:</strong> ${subjects.join(', ') || 'None'}</li>
      <li><strong>Estimated Study Time:</strong> ${studyTime} minutes</li>
      <li><strong>Current Streak:</strong> ${streak} days</li>
    </ul>
  `;
}

// Call this when analytics tab is shown
loadAnalytics();

// Load study sets for the user
async function loadStudySets() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { data: sets } = await supabase
    .from('study_sets')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  const list = document.getElementById('studySetsList');
  const noSetsMsg = document.getElementById('noStudySetsMessage');
  if (!list) return;

  list.innerHTML = '';
  if (!sets || sets.length === 0) {
    noSetsMsg.classList.remove('hidden');
    return;
  }
  noSetsMsg.classList.add('hidden');
  sets.forEach(set => {
    const el = document.createElement('div');
    el.className = 'study-set_card';
    el.innerHTML = `<strong>${set.title}</strong> <span>${set.subject}</span>`;
    list.appendChild(el);
  });
}

// Load library content (study sets and flashcards)
async function loadLibrary() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // Study Sets
  const { data: sets } = await supabase
    .from('study_sets')
    .select('*')
    .eq('user_id', user.id);

  const setsGrid = document.getElementById('setsGrid');
  setsGrid.innerHTML = '';
  if (sets && sets.length > 0) {
    sets.forEach(set => {
      const el = document.createElement('div');
      el.className = 'library-set-card';
      el.innerHTML = `<strong>${set.title}</strong> <span>${set.subject}</span>`;
      setsGrid.appendChild(el);
    });
  } else {
    setsGrid.innerHTML = '<p>No study sets found.</p>';
  }

  // Flashcards
  if (sets && sets.length > 0) {
    const setIds = sets.map(set => set.id);
    const { data: flashcards } = await supabase
      .from('flashcards')
      .select('*')
      .in('study_set_id', setIds);

    const flashGrid = document.getElementById('userFlashcardsGrid');
    flashGrid.innerHTML = '';
    if (flashcards && flashcards.length > 0) {
      flashcards.forEach(card => {
        const el = document.createElement('div');
        el.className = 'library-flashcard';
        el.innerHTML = `<strong>Q:</strong> ${card.question}<br><strong>A:</strong> ${card.answer}`;
        flashGrid.appendChild(el);
      });
    } else {
      flashGrid.innerHTML = '<p>No flashcards found.</p>';
    }
  }
}