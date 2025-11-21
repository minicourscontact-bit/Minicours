import express from "express";
import fs from "fs";
import path from "path";
import bodyParser from "body-parser";
import Stripe from "stripe";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const usersFile = path.join(__dirname, "users.json");

const app = express();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const PORT = process.env.PORT || 10000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

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
          unit_amount: 990,
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

// Servir la page d'accueil
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname,  "public", "index.html"));
});
// Route sécurisée pour télécharger les PDFs premium
app.get("/download", (req, res) => {
  const { file, email } = req.query;
  const users = loadUsers();

  if (!file) return res.status(400).send("Fichier manquant.");
  if (!email || !users[email]) return res.status(401).send("Utilisateur non identifié.");

  if (!users[email].premium)
    return res.status(403).send("Accès réservé aux membres Premium");

  const filePath = path.join(__dirname, "private", file);
  res.download(filePath);
});
app.listen(PORT, () => console.log(`✅ Serveur lancé sur le port ${PORT}`));
