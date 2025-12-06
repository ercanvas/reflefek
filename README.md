# Reflefek - Multiplayer Reflex Game

Çok oyunculu gerçek zamanlı refleks yarışması oyunu.

## Özellikler

- 🎮 Gerçek zamanlı çok oyunculu oyun
- ⚡ Hızlı refleks yarışması
- 🏆 İlk 10 puana ulaşan kazanır
- 👁️ İzleyici modu
- 🎨 Modern ve dinamik arayüz

## Kurulum

### Backend

```bash
cd backend
npm install
npm run dev
```

Backend sunucusu `http://localhost:3001` adresinde çalışacak.

### Frontend

```bash
cd frontend
npm install
npm start
```

Frontend uygulaması `http://localhost:3000` adresinde çalışacak.

## Nasıl Oynanır?

1. Frontend uygulamasını açın
2. "Yeni Oda Oluştur" butonuna tıklayın ve isminizi girin
3. Arkadaşlarınız odanıza katılsın veya başka bir pencerede kendiniz katılın
4. En az 2 oyuncu "Hazırım" butonuna tıkladığında oyun başlar
5. Ekrana rastgele bir sayı gösterilir
6. İlk tıklayan oyuncu puanı alır
7. İlk 10 puana ulaşan kazanır!

## İzleyici Modu

Odalar listesinden herhangi bir odanın "İzle" butonuna tıklayarak oyunu izleyebilirsiniz. İzleyiciler puan alamaz ama gerçek zamanlı skorları görebilir.

## Teknolojiler

- **Backend**: Express.js, Socket.io
- **Frontend**: React, Socket.io Client
- **Styling**: Modern CSS with animations

## Port Yapılandırması

- Backend: 3001
- Frontend: 3000

İyi oyunlar! ⚡
