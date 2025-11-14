server.js
package.json
users.json
public/
   index.html
   register.html
   login.html
   dashboard.html
   premium.html
   about.html
   mentions.html
   style.css
   fiche1.pdf
   svt.pdf
   maths.pdf
   physique.pdf
server.js
users.json  (vide au début : {})


import express from "express";
import fs from "fs";
import path from "path";
import bodyParser from "body-parser";
import Stripe from "stripe";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

const app = express();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const PORT = process.env.PORT || 10000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

const __dirname = path.resolve();
const usersFile = path.join(__dirname, "users.json");

// Charger les utilisateurs
function loadUsers() {
  if (!fs.existsSync(usersFile)) fs.writeFileSync(usersFile, "{}");
  return JSON.parse(fs.readFileSync(usersFile));
}

// Sauvegarder les utilisateurs
function saveUsers(users) {
  fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
}

// Envoi d’email automatique
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Route inscription
app.post("/register", (req, res) => {
  const { email, password } = req.body;
  const users = loadUsers();
  if (users[email]) return res.status(400).send("Email déjà utilisé");
  users[email] = { password, premium: false };
  saveUsers(users);

  // Email automatique de bienvenue
  transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Bienvenue sur MiniCours 🎓",
    text: "Merci pour ton inscription ! Voici ta fiche gratuite en pièce jointe.",
    attachments: [
      { filename: "fiche1.pdf", path: path.join(__dirname, "public", "fiche1.pdf") },
    ],
  });

  res.redirect("/login.html");
});

// Route connexion
app.post("/login", (req, res) => {
  const { email, password } = req.body;
  const users = loadUsers();
  if (!users[email] || users[email].password !== password)
    return res.status(400).send("Identifiants incorrects");
  res.redirect("/dashboard.html");
});

// Paiement Stripe
app.post("/create-checkout-session", async (req, res) => {
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "eur",
          product_data: { name: "Pack Premium MiniCours" },
          unit_amount: 990, // 9,90 €
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    success_url: `${process.env.DOMAIN}/premium.html`,
    cancel_url: `${process.env.DOMAIN}/dashboard.html`,
  });
  res.redirect(303, session.url);
});

app.listen(PORT, () => console.log(`✅ Serveur lancé sur le port ${PORT}`));
{}
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MiniCours - Fiches Terminale SVT, Maths, Physique</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <header>
    <h1>MiniCours 📚</h1>
    <nav>
      <a href="/register.html">Inscription</a>
      <a href="/login.html">Connexion</a>
      <a href="/about.html">À propos</a>
    </nav>
  </header>
  <main>
    <h2>Prépare Médecine & STAPS avec MiniCours</h2>
    <p>Des fiches claires, efficaces et faites pour les Terminales !</p>
    <a class="btn" href="/register.html">Commencer</a>
  </main>
</body>
</html>
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Inscription - MiniCours</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <h2>Inscription</h2>
  <form action="/register" method="post">
    <input type="email" name="email" placeholder="Ton e-mail" required>
    <input type="password" name="password" placeholder="Mot de passe" required>
    <button type="submit">S’inscrire</button>
  </form>
</body>
</html>
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Connexion - MiniCours</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <h2>Connexion</h2>
  <form action="/login" method="post">
    <input type="email" name="email" placeholder="Ton e-mail" required>
    <input type="password" name="password" placeholder="Mot de passe" required>
    <button type="submit">Se connecter</button>
  </form>
</body>
</html>
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tableau de bord - MiniCours</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <h2>Bienvenue sur ton espace MiniCours 🎓</h2>
  <p>Télécharge ta fiche gratuite :</p>
  <a href="/fiche1.pdf" download>Télécharger ma fiche gratuite</a>
  <hr>
  <h3>Passer Premium 💎</h3>
  <form action="/create-checkout-session" method="POST">
    <button type="submit">Accéder au Pack Premium (9,90€)</button>
  </form>
</body>
</html>
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MiniCours Premium</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <h2>Merci pour ton achat 💎</h2>
  <p>Voici tes fiches premium :</p>
  <a href="/svt.pdf" download>SVT</a><br>
  <a href="/maths.pdf" download>Maths</a><br>
  <a href="/physique.pdf" download>Physique</a>
</body>
</html>
body {
  font-family: Arial, sans-serif;
  background: #f6f8ff;
  color: #222;
  text-align: center;
  margin: 0;
  padding: 20px;
}
header {
  background: #004aad;
  color: white;
  padding: 15px;
}
a.btn, button {
  background: #0073ff;
  color: white;
  padding: 10px 15px;
  border: none;
  border-radius: 5px;
  text-decoration: none;
  display: inline-block;
  margin-top: 10px;
}
form input {
  display: block;
  margin: 10px auto;
  padding: 8px;
  width: 80%;
}
Build Command: npm install
Start Command: node server.js