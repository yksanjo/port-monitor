# Port Monitor

Real-time port monitoring with alerts and status dashboard.

## Installation

```bash
cd port-monitor
npm install
```

## Usage

### Start monitoring

```bash
npm start start 3000 3001 8080
```

### Dashboard view

```bash
npm start dashboard
```

### Watch specific port

```bash
npm start watch 3000
```

### Quick status

```bash
npm start status
```

## Commands

| Command | Description |
|---------|-------------|
| `start [ports]` | Start monitoring ports |
| `dashboard` | Show dashboard of dev ports |
| `watch <port>` | Watch for status changes |
| `status [ports]` | Quick status check |

## Options

- `-i, --interval <seconds>` - Check interval
