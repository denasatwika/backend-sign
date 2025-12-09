To install dependencies:
```sh
bun install
```

To run:
```sh
bun run dev
```

open http://localhost:3000

```sh
or push an existing repository from the command line
"git remote add origin https://github.com/denasatwika/backend-sign.git
git branch -M main
git push -u origin main
"
```
Matikan docker
```sh 
docker-compose down -v
```

Bangun ulang image dan jalankan container baru
```sh 
docker-compose up -d --build
```
migrasi database
```sh 
docker exec backend_sign bunx drizzle-kit push
```