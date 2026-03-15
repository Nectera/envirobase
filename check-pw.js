const bcrypt=require('./node_modules/bcryptjs');
const {PrismaClient}=require('./node_modules/@prisma/client');
const p=new PrismaClient();
p.user.findUnique({where:{email:'cody@necteraholdings.com'},select:{passwordHash:true}}).then(async u=>{
  const match=await bcrypt.compare('TempPass123!',u.passwordHash);
  console.log('Hash exists:',!!u.passwordHash);
  console.log('Password matches:',match);
  process.exit(0);
}).catch(e=>{console.error(e);process.exit(1)});
