import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, set, get, update, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyDR2OugzoVNnKN6OUKsPxC9ajldlhanteE",
    authDomain: "tournament-af6dd.firebaseapp.com",
    databaseURL: "https://tournament-af6dd-default-rtdb.firebaseio.com",
    projectId: "tournament-af6dd",
    appId: "1:726964405659:web:d03f72c2d6f8721bc98d3e"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// Original Names List
const PAKISTANI_NAMES = [ 
    'Ayesha','Nazim','Fatima','Sana','Maria','Hina','Zainab','Sara','Iqra','Mehreen','Nida','Ali','Ahmed','Usman','Hassan','Bilal','Imran','Kamran','Faisal','Zahid','Waqas','Aiman','Amna','Anaya','Areeba','Arisha','Arooj','Asma','Ayat','Azka','Benish','Bushra','Dua','Eman','Esha','Fariha','Farwa','Hafsa','Hajra','Hiba','Humaira','Ifrah','Inaya','Iram','Isma','Javeria','Kainat','Kanza','Komal','Laiba','Lubna','Maham','Mahnoor','Malaika','Mariam','Mehwish','Minal','Misbah','Momina','Nabeela','Nadia','Naima','Naila','Nashra','Neelam','Nimra','Noor','Rabab','Rabia','Rafayla','Ramsha','Rania','Rashida','Rida','Rimsha','Saba','Sadia','Saima','Samina','Saniya','Shanza','Shazia','Sidra','Sobia','Sonia','Sumaira','Tabassum','Tahira','Tania','Tehmina','Uzma','Wajiha','Yasmin','Yumna','Zara','Zarmeen','Zehra','Zain','Zoya','Zunaira','Sehrish','Aleena','Alishba','Anum','Aqsa','Bareera','Erum','Falak','Ghazal','Hoorain','Iqrah','Jannat','Kashaf','Laraib','Mahira','Nargis','Qandeel','Rukhsar','Sahar','Shifa','Tooba'
];

let userAuth = null;
let isLoginMode = true;
let isGameRunning = false;

const cardSuits = [
    { s: '♠', color: 'black-card' }, { s: '♣', color: 'black-card' },
    { s: '♦', color: 'red-card' }, { s: '♥', color: 'red-card' }
];

// --- Modal Controls ---
const modal = document.getElementById('modal-overlay');
document.getElementById('profile-trigger').onclick = () => modal.style.display = 'flex';
document.getElementById('close-modal').onclick = () => modal.style.display = 'none';

window.toggleAuthUI = () => {
    isLoginMode = !isLoginMode;
    document.getElementById('signup-fields').classList.toggle('hidden', isLoginMode);
    document.getElementById('auth-btn').innerText = isLoginMode ? "Confirm" : "Sign Up";
};

// --- Auth Handling ---
onAuthStateChanged(auth, (u) => {
    if(u) {
        userAuth = u;
        document.getElementById('auth-form').style.display = 'none';
        document.getElementById('profile-info').style.display = 'block';
        onValue(ref(db, 'users/' + u.uid), s => {
            const d = s.val();
            document.getElementById('wallet-display').innerText = `PKR ${d.wallet_balance}`;
            document.getElementById('prof-user').innerText = d.username;
            document.getElementById('prof-email').innerText = d.email;
            document.getElementById('prof-balance').innerText = d.wallet_balance;
            document.getElementById('user-display').innerText = d.username;
        });
    } else {
        userAuth = null;
        document.getElementById('auth-form').style.display = 'block';
        document.getElementById('profile-info').style.display = 'none';
        document.getElementById('wallet-display').innerText = "Login Required";
    }
});

document.getElementById('auth-btn').onclick = async () => {
    const e = document.getElementById('email').value, p = document.getElementById('password').value, u = document.getElementById('username').value;
    try {
        if(isLoginMode) await signInWithEmailAndPassword(auth, e, p);
        else {
            const r = await createUserWithEmailAndPassword(auth, e, p);
            await set(ref(db, 'users/' + r.user.uid), { username: u, email: e, wallet_balance: 500 });
        }
        modal.style.display = 'none';
    } catch (err) { alert(err.message); }
};

document.getElementById('logout-btn').onclick = () => { signOut(auth); modal.style.display = 'none'; };

// --- Game Logic ---
document.getElementById('main-play-btn').onclick = async () => {
    if(!userAuth) { modal.style.display = 'flex'; return; }
    const s = await get(ref(db, 'users/' + userAuth.uid));
    if(s.val().wallet_balance < 75) return alert("Low Balance!");
    
    await update(ref(db, 'users/' + userAuth.uid), { wallet_balance: s.val().wallet_balance - 75 });
    document.getElementById('lobby-screen').classList.add('hidden');
    document.getElementById('game-board').classList.remove('hidden');
    prepareRound();
};

function prepareRound() {
    isGameRunning = true;
    const shuffledNames = [...PAKISTANI_NAMES].sort(() => 0.5 - Math.random());
    for(let i=0; i<3; i++) {
        document.getElementById(`name-${i}`).innerText = shuffledNames[i];
        document.getElementById(`av-${i}`).innerText = shuffledNames[i][0];
    }
    document.querySelectorAll('.card').forEach(c => c.classList.add('active'));
}

window.startSpinSequence = async (cardIdx) => {
    if(!isGameRunning) return;
    isGameRunning = false;
    document.querySelectorAll('.card').forEach(c => c.classList.remove('active'));

    const adminSnap = await get(ref(db, 'game_settings/next_winner'));
    const winnerType = adminSnap.val() || 'default';
    
    let winPos; // 0:Green, 1:Blue, 2:Yellow, 3:User
    if(winnerType === 'user') winPos = 3;
    else if(winnerType === 'cpu0') winPos = 0;
    else if(winnerType === 'cpu1') winPos = 1;
    else if(winnerType === 'cpu2') winPos = 2;
    else winPos = Math.floor(Math.random() * 3);

    // Spin
    let current = 0, loops = 0, max = 20 + winPos;
    let timer = setInterval(() => {
        document.querySelectorAll('.corner').forEach(c => c.classList.remove('spinning-now'));
        document.getElementById(`corner-${current % 4}`).classList.add('spinning-now');
        current++; loops++;
        if(loops >= max) { clearInterval(timer); showFinalResult(winPos); }
    }, 100);
};

function showFinalResult(winnerPos) {
    document.getElementById(`corner-${winnerPos}`).classList.add('winner-active');
    
    const suits = [...cardSuits].sort(() => 0.5 - Math.random());
    document.querySelectorAll('.card').forEach((card, idx) => {
        const front = card.querySelector('.card-front');
        const suit = suits[idx];
        front.className = `card-face card-front ${suit.color}`;
        front.querySelector('.suit-center').innerText = suit.s;
        
        if(idx === winnerPos) {
            front.querySelector('.suit-corner').innerText = "A\n" + suit.s;
            front.querySelector('.suit-bottom').innerText = "A\n" + suit.s;
        } else {
            const low = ["7","8","9"][Math.floor(Math.random()*3)];
            front.querySelector('.suit-corner').innerText = low + "\n" + suit.s;
            front.querySelector('.suit-bottom').innerText = low + "\n" + suit.s;
        }
        card.classList.add('flipped');
    });

    let name = (winnerPos === 3) ? "YOU" : document.getElementById(`name-${winnerPos}`).innerText;
    if(winnerPos === 3) rewardUser();

    setTimeout(() => {
        document.getElementById('winner-info').innerText = name + " WON PKR 1000!";
        document.getElementById('result-screen').style.display = 'flex';
    }, 1500);
}

async function rewardUser() {
    const s = await get(ref(db, 'users/' + userAuth.uid));
    await update(ref(db, 'users/' + userAuth.uid), { wallet_balance: s.val().wallet_balance + 1000 });
}

window.backToLobby = () => {
    document.getElementById('result-screen').style.display = 'none';
    document.getElementById('game-board').classList.add('hidden');
    document.getElementById('lobby-screen').classList.remove('hidden');
    document.querySelectorAll('.card').forEach(c => c.classList.remove('flipped', 'active'));
    document.querySelectorAll('.corner').forEach(c => c.classList.remove('winner-active', 'spinning-now'));
};
