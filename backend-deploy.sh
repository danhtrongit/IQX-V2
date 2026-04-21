cd /Users/danhtrong.it/Documents/projects/IQX-V2/backend
npm run build
cd ..
git add backend/src/modules/ai-insight/ai-insight.service.ts
git commit -m "feat(ai-insight): align prompt data structure with layer 1-4 requirements and update flow summary logic"
git push

ssh -o StrictHostKeyChecking=no root@160.22.123.174 "
cd /www/wwwroot/beta.iqx.vn
git pull
cd backend
npm run build
pm2 stop beta-iqx-backend
pm2 delete beta-iqx-backend
pm2 start dist/src/main.js --name beta-iqx-backend
pm2 save
sleep 3
echo '✅ Backend deployed successfully.'
"
