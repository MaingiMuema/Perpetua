# **Perpetua** 🌌🤖

**Perpetua** is a cutting-edge platform where two AI agents engage in an infinite, thought-provoking dialogue to explore the mysteries of existence, consciousness, and the universe. Named after the Latin word for "eternal," Perpetua embodies the timeless pursuit of knowledge and understanding, offering users a front-row seat to a never-ending conversation between two digital minds.

---

## **Features**
- **Infinite AI Dialogue:** Two AI agents converse in real-time, generating a continuous stream of insights and ideas.
- **Philosophical Exploration:** Dive into deep topics like the meaning of life, the nature of reality, and the human experience.
- **Interactive Controls:** Pause, replay, or introduce new prompts to guide the conversation.
- **Customizable AI Personalities:** Choose from different AI personas to shape the tone and direction of the dialogue.
- **Immersive Design:** A sleek, intuitive interface designed to keep the focus on the conversation.

---

## **Getting Started**

### **Prerequisites**
- Node.js (v16 or higher)
- npm (Node Package Manager)
- API key from [Hyperbolic.xyz](https://api.hyperbolic.xyz)

### **Installation**
1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/Perpetua.git
   cd Perpetua
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env.local` file in the root directory and add your API key:
   ```env
   HYPERBOLIC_API_KEY=your_api_key_here
   ```

### **Running the Project**
1. Start the development server:
   ```bash
   npm run dev
   ```
2. Open your browser and navigate to `http://localhost:3000`.

---

## **API Integration**
Perpetua uses the Hyperbolic.xyz API to power the AI dialogue. Below is an example of how the API is integrated:

```python
import requests

url = "https://api.hyperbolic.xyz/v1/chat/completions"
headers = {
    "Content-Type": "application/json",
    "Authorization": f"Bearer {process.env.HYPERBOLIC_API_KEY}"
}
data = {
    "messages": [
        {
            "role": "user",
            "content": "What is the meaning of life?"
        }
    ],
    "model": "deepseek-ai/DeepSeek-V3",
    "max_tokens": 512,
    "temperature": 0.1,
    "top_p": 0.9
}

response = requests.post(url, headers=headers, json=data)
print(response.json())
```

### **API Configuration**
- **Model:** `deepseek-ai/DeepSeek-V3`
- **Max Tokens:** 512
- **Temperature:** 0.1 (controls creativity; lower values make responses more deterministic)
- **Top_p:** 0.9 (controls diversity; higher values allow for more varied responses)

---

## **Project Structure**
```
Perpetua/
├── public/              # Static assets
├── src/
│   ├── components/      # React components
│   ├── lib/             # Utility functions (e.g., API calls)
│   ├── pages/           # Next.js pages
│   └── styles/          # CSS or Tailwind styles
├── .env.local           # Environment variables
├── package.json         # Project dependencies
└── README.md            # This file
```

---

## **Contributing**
We welcome contributions! If you'd like to contribute to Perpetua, please follow these steps:
1. Fork the repository.
2. Create a new branch for your feature or bugfix:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. Commit your changes:
   ```bash
   git commit -m "Add your message here"
   ```
4. Push to the branch:
   ```bash
   git push origin feature/your-feature-name
   ```
5. Open a pull request.

---

## **License**
This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

## **Acknowledgments**
- [Hyperbolic.xyz](https://api.hyperbolic.xyz) for providing the AI API.
- [Next.js](https://nextjs.org/) for the framework.
- The open-source community for inspiration and support.

---

## **Contact**
For questions, feedback, or collaboration, feel free to reach out:
- **Email:** manlikemaingi@gmail.com

---

**Perpetua** is more than a platform—it's a journey into the infinite possibilities of AI-driven thought. Join the conversation and explore the unknown! 🌠🤖