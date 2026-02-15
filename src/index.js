#!/usr/bin/env node

const { Command } = require('commander');
const chalk = require('chalk');
const { exec } = require('child_process');
const util = require('util');

const execPromise = util.promisify(exec);

const DEV_PORTS = [3000, 3001, 3002, 3003, 3004, 3005, 4000, 4001, 4200, 5000, 5001,
  5173, 5174, 5175, 5176, 5177, 5178, 5179, 5180, 5500, 6000, 7000,
  8000, 8080, 8081, 8888, 9000, 27017];

const program = new Command();

program
  .name('port-monitor')
  .description('Real-time port monitoring with alerts and status dashboard')
  .version('1.0.0');

/**
 * Check if port is in use
 */
async function isPortInUse(port) {
  return new Promise((resolve) => {
    const net = require('net');
    const server = net.createServer();
    server.once('error', () => resolve(true));
    server.once('listening', () => {
      server.close(() => resolve(false));
    });
    server.listen(port, '127.0.0.1');
  });
}

/**
 * Get port info
 */
async function getPortInfo(port) {
  try {
    const { stdout } = await execPromise(`lsof -i :${port} -t`);
    const pid = stdout.trim();
    if (pid) {
      const { stdout: psOut } = await execPromise(`ps -p ${pid} -o args=`);
      return { pid, command: psOut.trim() };
    }
  } catch {}
  return null;
}

/**
 * Monitor ports
 */
async function monitorPorts(ports, interval) {
  const state = {};
  
  console.log(chalk.blue.bold('\n📊 Port Monitor'));
  console.log(chalk.gray('═'.repeat(60)));
  console.log(`   Monitoring: ${chalk.cyan(ports.join(', '))}`);
  console.log(`   Interval: ${interval}s`);
  console.log(chalk.gray('═'.repeat(60)));
  console.log(chalk.yellow('   Press Ctrl+C to stop\n'));

  const check = async () => {
    console.clear();
    console.log(chalk.blue.bold('\n📊 Port Monitor'));
    console.log(chalk.gray('═'.repeat(60)));
    console.log(`   Time: ${new Date().toLocaleTimeString()}`);
    console.log(chalk.gray('─'.repeat(60)));
    
    for (const port of ports) {
      const inUse = await isPortInUse(port);
      const prev = state[port];
      const now = inUse ? 'busy' : 'free';
      
      if (prev !== now) {
        if (inUse) {
          const info = await getPortInfo(port);
          console.log(chalk.red(`   🔴 Port ${port}: NOW BUSY`) + (info ? chalk.gray(` (${info.command})`) : ''));
        } else {
          console.log(chalk.green(`   🟢 Port ${port}: NOW FREE`));
        }
      } else {
        console.log(inUse 
          ? chalk.red(`   🔴 Port ${port}: BUSY`)
          : chalk.green(`   🟢 Port ${port}: FREE`));
      }
      
      state[port] = now;
    }
    
    console.log(chalk.gray('─'.repeat(60)));
  };
  
  await check();
  const intervalId = setInterval(check, interval * 1000);
  
  process.on('SIGINT', () => {
    clearInterval(intervalId);
    console.log(chalk.gray('\n\n👋 Stopped monitoring.\n'));
    process.exit(0);
  });
}

program
  .command('start')
  .description('Start monitoring ports')
  .argument('[ports...]', 'Ports to monitor', DEV_PORTS.map(String))
  .option('-i, --interval <seconds>', 'Check interval', '5')
  .action(async (ports, options) => {
    const portNums = ports.map(p => parseInt(p));
    await monitorPorts(portNums, parseInt(options.interval));
  });

program
  .command('dashboard')
  .description('Show dashboard of all dev ports')
  .option('-i, --interval <seconds>', 'Refresh interval', '3')
  .action(async (options) => {
    console.log(chalk.blue.bold('\n📊 Port Dashboard'));
    console.log(chalk.gray('Press Ctrl+C to exit\n'));
    
    const show = async () => {
      console.clear();
      console.log(chalk.blue.bold('📊 Port Dashboard'));
      console.log(chalk.gray('═'.repeat(70)));
      console.log(`   Last update: ${new Date().toLocaleString()}`);
      console.log(chalk.gray('─'.repeat(70)));
      
      const status = await Promise.all(DEV_PORTS.slice(0, 20).map(async (port) => {
        const inUse = await isPortInUse(port);
        const info = inUse ? await getPortInfo(port) : null;
        return { port, inUse, info };
      }));
      
      console.log(chalk.gray('  Port    Status    Process'));
      console.log(chalk.gray('─'.repeat(70)));
      
      for (const s of status) {
        const port = String(s.port).padEnd(8);
        const statusStr = s.inUse 
          ? chalk.red('BUSY  ') 
          : chalk.green('FREE  ');
        const proc = s.info 
          ? s.info.command.substring(0, 30)
          : '-';
        
        console.log(`  ${chalk.cyan(port)} ${statusStr} ${proc}`);
      }
      
      console.log(chalk.gray('─'.repeat(70)));
      console.log(chalk.gray(`   Total: ${status.filter(s => s.inUse).length} busy, ${status.filter(s => !s.inUse).length} free`));
    };
    
    await show();
    const intervalId = setInterval(show, parseInt(options.interval) * 1000);
    
    process.on('SIGINT', () => {
      clearInterval(intervalId);
      console.log(chalk.gray('\n👋 Stopped.\n'));
      process.exit(0);
    });
  });

program
  .command('watch')
  .description('Watch for port status changes')
  .argument('<port>', 'Port to watch')
  .option('-i, --interval <seconds>', 'Check interval', '2')
  .action(async (port, options) => {
    const portNum = parseInt(port);
    
    console.log(chalk.blue.bold(`\n👁️ Watching port ${portNum}...\n`));
    
    let lastStatus = null;
    
    const check = async () => {
      const inUse = await isPortInUse(portNum);
      const status = inUse ? 'BUSY' : 'FREE';
      
      if (status !== lastStatus) {
        if (inUse) {
          const info = await getPortInfo(portNum);
          console.log(chalk.red(`[${new Date().toLocaleTimeString()}] 🔴 Port ${portNum} became BUSY`) + 
            (info ? chalk.gray(` - ${info.command}`) : ''));
        } else {
          console.log(chalk.green(`[${new Date().toLocaleTimeString()}] 🟢 Port ${portNum} became FREE`));
        }
        lastStatus = status;
      }
    };
    
    await check();
    const intervalId = setInterval(check, parseInt(options.interval) * 1000);
    
    process.on('SIGINT', () => {
      clearInterval(intervalId);
      console.log(chalk.gray('\n👋 Stopped watching.\n'));
      process.exit(0);
    });
  });

program
  .command('status')
  .description('Quick status check')
  .argument('[ports...]', 'Ports to check', DEV_PORTS.slice(0, 10).map(String))
  .action(async (ports) => {
    const status = await Promise.all(ports.map(async (port) => {
      const portNum = parseInt(port);
      const inUse = await isPortInUse(portNum);
      const info = inUse ? await getPortInfo(portNum) : null;
      return { port: portNum, inUse, info };
    }));
    
    console.log(chalk.blue.bold('\n📊 Port Status\n'));
    
    for (const s of status) {
      if (s.inUse) {
        console.log(chalk.red(`  ${s.port}: BUSY`) + chalk.gray(` (${s.info?.command || 'unknown'})`));
      } else {
        console.log(chalk.green(`  ${s.port}: FREE`));
      }
    }
    console.log();
  });

program.parse();
