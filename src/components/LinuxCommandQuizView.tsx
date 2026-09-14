import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';

type CommandFact = {
  command: string;
  purpose: string;
  syntax: string;
  flag: string;
  flagMeaning: string;
};

type Question = {
  id: number;
  command: string;
  syntax: string;
  prompt: string;
  options: string[];
  answer: number;
  explanation: string;
};

const commandFacts: CommandFact[] = [
  ['ls', 'list directory contents', 'ls -la', '-a', 'show hidden files'],
  ['cd', 'change the current directory', 'cd /var/log', '..', 'move to the parent directory'],
  ['pwd', 'print the current working directory', 'pwd', '-P', 'show the physical path without symlinks'],
  ['mkdir', 'create directories', 'mkdir -p app/logs', '-p', 'create parent directories as needed'],
  ['touch', 'create an empty file or update its timestamp', 'touch notes.txt', '-a', 'change access time only'],
  ['cp', 'copy files and directories', 'cp source.txt backup.txt', '-r', 'copy directories recursively'],
  ['mv', 'move or rename files', 'mv old.txt new.txt', '-i', 'ask before overwriting'],
  ['rm', 'remove files', 'rm -i old.txt', '-r', 'remove directories recursively'],
  ['rmdir', 'remove empty directories', 'rmdir empty-dir', '-p', 'remove empty parent directories too'],
  ['cat', 'display or concatenate file contents', 'cat file.txt', '-n', 'number output lines'],
  ['less', 'view text one screen at a time', 'less /var/log/syslog', '-N', 'show line numbers'],
  ['head', 'show the beginning of a file', 'head -n 20 file.txt', '-n', 'choose the number of lines'],
  ['tail', 'show the end of a file', 'tail -f app.log', '-f', 'follow appended data'],
  ['grep', 'search text matching a pattern', 'grep -rin error logs/', '-r', 'search recursively'],
  ['find', 'search for files and directories', 'find . -name "*.log"', '-type', 'filter by file type'],
  ['locate', 'quickly find paths from an index', 'locate ssh_config', '-i', 'ignore case'],
  ['wc', 'count lines, words, and bytes', 'wc -l access.log', '-l', 'count lines'],
  ['sort', 'sort lines of text', 'sort -n scores.txt', '-n', 'sort numerically'],
  ['uniq', 'report or omit repeated adjacent lines', 'sort names | uniq -c', '-c', 'count occurrences'],
  ['cut', 'extract sections from each line', 'cut -d: -f1 /etc/passwd', '-d', 'set the field delimiter'],
  ['tr', 'translate or delete characters', 'tr a-z A-Z', '-d', 'delete characters'],
  ['sed', 'stream-edit text', 'sed -n "1,5p" file.txt', '-n', 'suppress automatic printing'],
  ['awk', 'process structured text by fields', 'awk "{print $1}" file.txt', '-F', 'set the field separator'],
  ['xargs', 'build commands from standard input', 'printf "a b" | xargs -n1 echo', '-n', 'use a maximum number of arguments'],
  ['tee', 'write input to screen and a file', 'command | tee output.log', '-a', 'append to the file'],
  ['echo', 'print text or variable values', 'echo $PATH', '-n', 'omit the trailing newline'],
  ['printf', 'format and print text', 'printf "%s\\n" "$USER"', '%s', 'format a string value'],
  ['man', 'display a command manual', 'man chmod', '-k', 'search manual page descriptions'],
  ['which', 'show the executable path in PATH', 'which bash', '-a', 'show all matching paths'],
  ['history', 'show previously used commands', 'history 20', '-c', 'clear the history list'],
  ['chmod', 'change file permission bits', 'chmod 640 secrets.txt', '-R', 'change permissions recursively'],
  ['chown', 'change file owner and group', 'chown alice:dev file.txt', '-R', 'apply ownership recursively'],
  ['chgrp', 'change the group ownership', 'chgrp developers app.log', '-R', 'apply group changes recursively'],
  ['stat', 'display detailed file metadata', 'stat file.txt', '-c', 'use a custom output format'],
  ['du', 'estimate file and directory space usage', 'du -sh /var/log', '-h', 'use human-readable units'],
  ['df', 'report filesystem free space', 'df -h', '-T', 'show filesystem type'],
  ['ps', 'show running processes', 'ps aux', '-e', 'select every process'],
  ['top', 'monitor processes interactively', 'top', '-u', 'show processes for a user'],
  ['kill', 'send a signal to a process', 'kill -TERM 1234', '-9', 'send SIGKILL'],
  ['pkill', 'send a signal by process name', 'pkill -f worker', '-f', 'match the full command line'],
  ['jobs', 'list jobs in the current shell', 'jobs -l', '-l', 'include process IDs'],
  ['bg', 'resume a stopped job in the background', 'bg %1', '-l', 'list jobs instead of resuming one'],
  ['fg', 'bring a background job to the foreground', 'fg %1', '', 'use the current job when no ID is given'],
  ['nohup', 'run a command immune to hangups', 'nohup ./backup.sh &', '', 'redirect output to nohup.out by default'],
  ['nice', 'run a process with an adjusted priority', 'nice -n 10 backup.sh', '-n', 'set the niceness adjustment'],
  ['renice', 'change priority of a running process', 'renice 5 -p 1234', '-p', 'select a process ID'],
  ['free', 'display memory usage', 'free -h', '-m', 'show values in megabytes'],
  ['uptime', 'show system uptime and load averages', 'uptime', '-p', 'show uptime in a pretty format'],
  ['uname', 'print system information', 'uname -a', '-r', 'show the kernel release'],
  ['hostname', 'show or set the system hostname', 'hostname', '-f', 'show the fully qualified domain name'],
  ['date', 'display or set system date and time', 'date -u', '-u', 'show UTC time'],
  ['whoami', 'print the effective user name', 'whoami', '', 'show the current effective account'],
  ['id', 'display user and group identity', 'id alice', '-u', 'show the effective user ID'],
  ['ssh', 'connect securely to a remote host', 'ssh user@example.com', '-p', 'connect to a specified port'],
  ['scp', 'securely copy files between hosts', 'scp file user@host:/tmp/', '-r', 'copy directories recursively'],
  ['curl', 'transfer data from or to a URL', 'curl -I https://example.com', '-I', 'fetch response headers only'],
  ['wget', 'download files from the web', 'wget https://example.com/file.zip', '-c', 'continue an interrupted download'],
  ['ip', 'show and manage network interfaces and routes', 'ip addr show', 'route', 'work with the routing table'],
  ['ss', 'inspect sockets and network connections', 'ss -tulpn', '-l', 'show listening sockets'],
  ['ping', 'test reachability with ICMP echo', 'ping -c 4 8.8.8.8', '-c', 'send a specific count of packets'],
  ['dig', 'query DNS records', 'dig example.com MX', '+short', 'return a concise answer'],
  ['nslookup', 'query DNS servers interactively', 'nslookup example.com', '-type=', 'select the DNS record type'],
  ['traceroute', 'show the network path to a host', 'traceroute example.com', '-m', 'set the maximum hop count'],
  ['tar', 'archive or extract files', 'tar -czf backup.tar.gz app/', '-x', 'extract an archive'],
  ['gzip', 'compress data with gzip', 'gzip access.log', '-d', 'decompress a gzip file'],
  ['gunzip', 'decompress gzip files', 'gunzip access.log.gz', '-c', 'write decompressed data to stdout'],
  ['zip', 'create ZIP archives', 'zip -r site.zip site/', '-r', 'include directories recursively'],
  ['unzip', 'extract ZIP archives', 'unzip site.zip', '-l', 'list archive contents'],
  ['sha256sum', 'calculate SHA-256 checksums', 'sha256sum image.iso', '-c', 'verify checksums from a file'],
  ['md5sum', 'calculate MD5 checksums', 'md5sum download.bin', '-c', 'check hashes from a file'],
  ['openssl', 'use cryptographic and TLS tools', 'openssl s_client -connect host:443', 'version', 'show the OpenSSL version'],
  ['gpg', 'encrypt, decrypt, and sign data', 'gpg --verify file.sig', '--export', 'export public keys'],
  ['history', 'review commands entered in the shell', 'history | tail', '-w', 'write the current history to a file'],
  ['env', 'run a command with environment variables', 'env | sort', '-i', 'start with an empty environment'],
  ['export', 'make a shell variable available to child processes', 'export APP_ENV=prod', '-n', 'remove a variable from export'],
  ['source', 'run commands from a file in the current shell', 'source .env', '', 'load changes into the current shell'],
  ['alias', 'define or display command shortcuts', 'alias ll="ls -la"', '-p', 'print aliases in reusable form'],
  ['sudo', 'run a command with another user privilege', 'sudo systemctl status ssh', '-u', 'run as a specified user'],
  ['su', 'switch to another user account', 'su - alice', '-', 'start a login shell'],
  ['passwd', 'change a user password', 'passwd alice', '-l', 'lock the account password'],
  ['useradd', 'create a user account', 'useradd -m alice', '-m', 'create the home directory'],
  ['usermod', 'modify a user account', 'usermod -aG docker alice', '-aG', 'append the user to supplementary groups'],
  ['userdel', 'delete a user account', 'userdel -r alice', '-r', 'remove the home directory and mail spool'],
  ['groupadd', 'create a group', 'groupadd developers', '-f', 'exit successfully if the group exists'],
  ['systemctl', 'control systemd services', 'systemctl restart nginx', 'enable', 'enable a service at boot'],
  ['journalctl', 'query the systemd journal', 'journalctl -u nginx', '-f', 'follow new journal entries'],
  ['crontab', 'manage per-user scheduled jobs', 'crontab -e', '-l', 'list the current cron table'],
  ['mount', 'attach a filesystem', 'mount /dev/sdb1 /mnt/data', '-a', 'mount filesystems from fstab'],
  ['umount', 'detach a filesystem', 'umount /mnt/data', '-l', 'perform a lazy unmount'],
  ['lsblk', 'list block devices', 'lsblk -f', '-f', 'show filesystem information'],
  ['fdisk', 'partition disks', 'fdisk -l', '-l', 'list partition tables'],
  ['lsof', 'list open files and sockets', 'lsof -i :443', '-i', 'select network files'],
  ['dmesg', 'read the kernel ring buffer', 'dmesg --level=err,warn', '--follow', 'wait for new kernel messages'],
  ['journalctl', 'read logs collected by systemd', 'journalctl -b', '-b', 'show messages from a boot'],
  ['logger', 'write a message to the system log', 'logger "backup complete"', '-t', 'set a tag for the message'],
  ['screen', 'run persistent terminal sessions', 'screen -S deploy', '-r', 'reattach to a session'],
  ['tmux', 'multiplex persistent terminal sessions', 'tmux new -s ops', 'attach', 'connect to an existing session'],
  ['clear', 'clear the terminal display', 'clear', '-x', 'clear the screen while preserving scrollback'],
  ['man', 'read installed command documentation', 'man -k network', '-f', 'show a short description'],
  ['printf', 'print formatted shell output', 'printf "%05d" 42', '%d', 'format an integer'],
].map(([command, purpose, syntax, flag, flagMeaning]) => ({ command, purpose, syntax, flag, flagMeaning }));

const buildQuestions = (): Question[] => commandFacts.slice(0, 50).flatMap((fact, factIndex) => {
  const distractors = commandFacts.filter((candidate) => candidate.command !== fact.command).slice(factIndex + 2, factIndex + 5).map((candidate) => candidate.command);
  const optionsFor = (correct: string) => [correct, ...distractors].slice(0, 4);
  const questionSet: Array<{ prompt: string; correct: string; explanation: string }> = [
    { prompt: `Which Linux command is primarily used to ${fact.purpose}?`, correct: fact.command, explanation: `${fact.command} is used to ${fact.purpose}.` },
    { prompt: `Which command matches this example: ${fact.syntax}?`, correct: fact.command, explanation: `The command is ${fact.command}. Example: ${fact.syntax}.` },
    { prompt: `What does the ${fact.command} command do?`, correct: fact.purpose, explanation: `${fact.command}: ${fact.purpose}.` },
    { prompt: `What does the ${fact.flag || 'default behavior'} option or behavior mean for ${fact.command}?`, correct: fact.flagMeaning, explanation: `${fact.command} ${fact.flag}: ${fact.flagMeaning}.` },
  ];
  return questionSet.map((item, variantIndex) => {
    const choices = variantIndex === 2
      ? optionsFor(item.correct).map((option) => commandFacts.find((candidate) => candidate.command === option)?.purpose || option)
      : variantIndex === 3
        ? [item.correct, 'delete the file', 'show a graphical interface', 'change the hostname']
        : optionsFor(item.correct);
    const answer = variantIndex % choices.length;
    const rotatedChoices = choices.map((_, index) => choices[(index + answer) % choices.length]);
    return { id: factIndex * 4 + variantIndex, command: fact.command, syntax: fact.syntax, prompt: item.prompt, options: rotatedChoices, answer: (choices.length - answer) % choices.length, explanation: item.explanation };
  });
});

const QUESTIONS = buildQuestions();
const STORAGE_KEY = 'securewatch-linux-command-quiz-v1';

type SavedState = { answers: Record<string, number>; dailyDate: string; dailyCount: number; certificateName: string };
const todayKey = () => new Date().toISOString().slice(0, 10);
const initialState = (): SavedState => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') as SavedState | null;
    if (saved && saved.dailyDate === todayKey()) return saved;
    return { answers: saved?.answers || {}, dailyDate: todayKey(), dailyCount: 0, certificateName: saved?.certificateName || '' };
  } catch {
    return { answers: {}, dailyDate: todayKey(), dailyCount: 0, certificateName: '' };
  }
};

export const LinuxCommandQuizView: React.FC = () => {
  const [state, setState] = useState<SavedState>(initialState);
  const [selected, setSelected] = useState<number | null>(null);
  const [isCertificatePreviewOpen, setIsCertificatePreviewOpen] = useState(false);
  const [name, setName] = useState(state.certificateName);
  const [activeQuestionId, setActiveQuestionId] = useState<number | null>(() => {
    const saved = initialState();
    return QUESTIONS.find((question) => saved.answers[String(question.id)] === undefined)?.id ?? null;
  });
  const completed = Object.keys(state.answers).length;
  const dailyRemaining = Math.max(0, 50 - state.dailyCount);
  const currentQuestion = QUESTIONS.find((question) => question.id === activeQuestionId);
  const certificateReady = completed >= 200;
  const progress = Math.round((completed / 200) * 100);
  const isLocked = !currentQuestion || dailyRemaining === 0;

  const persist = (next: SavedState) => {
    setState(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const submitAnswer = (answer: number) => {
    if (!currentQuestion || isLocked || selected !== null) return;
    setSelected(answer);
    const next = { ...state, answers: { ...state.answers, [currentQuestion.id]: answer }, dailyCount: state.dailyCount + 1, dailyDate: todayKey() };
    persist(next);
  };

  const goToNextQuestion = () => {
    const nextQuestion = QUESTIONS.find((question) => state.answers[String(question.id)] === undefined);
    setSelected(null);
    setActiveQuestionId(nextQuestion?.id ?? null);
  };

  const resetQuiz = () => {
    if (window.confirm('Reset all Linux quiz progress? This cannot be undone.')) {
      const next = { answers: {}, dailyDate: todayKey(), dailyCount: 0, certificateName: '' };
      setSelected(null);
      setName('');
      persist(next);
    }
  };

  const downloadCertificate = () => {
    const safeName = name.trim() || 'Linux Security Learner';
    const escapedName = safeName.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[character] || character));
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="1000" viewBox="0 0 1400 1000"><rect width="1400" height="1000" fill="#294b31"/><rect x="44" y="44" width="1312" height="912" fill="#ffffff" stroke="#91a891" stroke-width="22"/><path d="M90 130V90h40M1270 90h40v40M90 870v40h40M1270 910h40v-40" fill="none" stroke="#294b31" stroke-width="20"/><g opacity=".07" fill="none" stroke="#94a3b8" stroke-width="2"><ellipse cx="700" cy="500" rx="420" ry="105"/><ellipse cx="700" cy="500" rx="420" ry="105" transform="rotate(30 700 500)"/><ellipse cx="700" cy="500" rx="420" ry="105" transform="rotate(60 700 500)"/></g><g text-anchor="middle" fill="#202326" font-family="Georgia,serif"><text x="700" y="180" font-size="57">WEB APPLICATION SECURITY</text><text x="700" y="260" font-size="57">AWARD CERTIFICATE</text><text x="700" y="340" font-family="Arial,sans-serif" font-size="22">Awarded to Bootcamp Participants</text><text x="700" y="445" font-size="58">${escapedName || 'JOHN DOE'}</text><line x1="220" y1="470" x2="1180" y2="470" stroke="#777" stroke-width="2"/><text x="700" y="535" font-family="Arial,sans-serif" font-size="31" font-weight="bold">For Web Application &amp; API Security</text><text x="700" y="585" font-family="Arial,sans-serif" font-size="20">Presented to bootcamp participants who built and demonstrated a Web Application &amp; API</text><text x="700" y="616" font-family="Arial,sans-serif" font-size="20">Security dashboard, showcasing applied skills in web security practices. Awarded by our</text><text x="700" y="647" font-family="Arial,sans-serif" font-size="20">program for excellence in learning outcomes.</text><circle cx="700" cy="770" r="78" fill="#d9a832" stroke="#8f6518" stroke-width="8"/><text x="700" y="755" font-size="18">BEST</text><text x="700" y="782" font-size="28">2026</text><text x="700" y="807" font-size="15">AWARD</text><text x="270" y="855" font-family="Arial,sans-serif" font-size="20">09/14/2026</text><line x1="160" y1="875" x2="380" y2="875" stroke="#777"/><text x="270" y="907" font-family="Arial,sans-serif" font-size="18">Issue Date</text><text x="1100" y="850" font-family="cursive" font-size="38" font-style="italic">K.Kharat</text><line x1="970" y1="875" x2="1230" y2="875" stroke="#777"/><text x="1100" y="907" font-family="Arial,sans-serif" font-size="18">Program Director</text></g></svg>`;
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    link.download = `${safeName.replace(/[^a-z0-9]+/gi, '_')}_Linux_Certificate.svg`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const questionNumber = completed + 1;
  return (
    <div className="space-y-5 pb-8">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-cyan-500/20 pb-5">
        <div>
          <div className="flex items-center gap-2 text-cyan-300 text-[11px] font-mono uppercase tracking-[0.2em]"><i className="fa-brands fa-linux" /> Linux Command Academy</div>
          <h1 className="text-2xl md:text-3xl font-bold text-white mt-2">200 Command MCQ Assessment</h1>
          <p className="text-sm text-slate-400 mt-1">50 new questions per day. Every answer is checked with an explanation.</p>
        </div>
        <button onClick={resetQuiz} className="text-xs text-slate-400 hover:text-red-300 border border-slate-700 px-3 py-2 rounded-lg cursor-pointer"><i className="fa-solid fa-rotate-left mr-2" />Reset progress</button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[['Completed', `${completed}/200`, 'text-cyan-300'], ['Progress', `${progress}%`, 'text-emerald-300'], ['Today left', `${dailyRemaining}/50`, 'text-amber-300'], ['Status', certificateReady ? 'CERTIFIED' : 'IN TRAINING', certificateReady ? 'text-emerald-300' : 'text-slate-200']].map(([label, value, color]) => <div key={label} className="rounded-xl border border-cyan-500/20 bg-[#071827]/80 p-4"><div className="text-[10px] uppercase tracking-wider text-slate-500">{label}</div><div className={`mt-1 text-xl font-bold ${color}`}>{value}</div></div>)}
      </div>

      <div className="h-2 rounded-full bg-slate-800 overflow-hidden"><motion.div className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400" initial={{ width: 0 }} animate={{ width: `${progress}%` }} /></div>

      {!certificateReady && (
        <section className="rounded-xl border border-slate-700/80 bg-slate-950/40 p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-600 bg-slate-900 text-slate-500"><i className="fa-solid fa-lock" /></div>
              <div><div className="text-sm font-bold text-slate-200">Certificate preview</div><p className="mt-1 text-xs text-slate-400">Click Open to view the certificate. Download unlocks only after all 200 Linux MCQs are complete.</p></div>
            </div>
            <button onClick={() => setIsCertificatePreviewOpen(true)} className="shrink-0 rounded-lg border border-cyan-400/40 px-3 py-2 text-xs font-bold text-cyan-300 hover:bg-cyan-400/10 cursor-pointer"><i className="fa-solid fa-expand mr-2" />Open</button>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs"><span className="text-amber-300"><i className="fa-solid fa-lock mr-2" />Download locked until 200/200</span><span className="font-mono text-cyan-300">Click Open to preview</span></div>
        </section>
      )}

      {isCertificatePreviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Linux certificate preview">
          <div className="w-full max-w-3xl rounded-2xl border border-cyan-500/30 bg-[#071827] p-4 shadow-2xl md:p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">Certificate Preview</h2>
                <p className="text-xs text-slate-400">Preview only. Download unlocks at 200/200.</p>
              </div>
              <button onClick={() => setIsCertificatePreviewOpen(false)} className="rounded-lg border border-slate-700 px-3 py-2 text-slate-300 hover:text-white cursor-pointer" aria-label="Close certificate preview"><i className="fa-solid fa-xmark" /></button>
            </div>
            <div className="relative aspect-[1.4/1] overflow-hidden border-[10px] border-[#294b31] bg-[#f8faf7] p-5 text-center text-[#202326] shadow-inner md:border-[16px] md:p-10">
              <div className="absolute inset-3 border-2 border-[#91a891] md:inset-5" />
              <div className="absolute inset-[16%_10%] opacity-[.08] [background:repeating-radial-gradient(ellipse_at_center,transparent_0_26px,#64748b_27px_28px,transparent_29px_55px)]" />
              <div className="relative flex h-full flex-col items-center justify-center font-serif">
                <div className="text-[clamp(.85rem,2.7vw,2.15rem)] tracking-wide">WEB APPLICATION SECURITY</div>
                <div className="text-[clamp(.85rem,2.7vw,2.15rem)] tracking-wide">AWARD CERTIFICATE</div>
                <div className="mt-3 font-sans text-[clamp(.45rem,1.15vw,.85rem)]">Awarded to Bootcamp Participants</div>
                <div className="mt-3 border-b border-[#777] px-8 pb-1 text-[clamp(.9rem,2.5vw,2rem)]">{name.trim() || 'JOHN DOE'}</div>
                <div className="mt-3 font-sans text-[clamp(.55rem,1.3vw,1rem)] font-bold">For Web Application &amp; API Security</div>
                <div className="mt-1 max-w-2xl font-sans text-[clamp(.38rem,1vw,.68rem)] leading-relaxed">Presented to bootcamp participants who built and demonstrated a Web Application &amp; API<br />Security dashboard, showcasing applied skills in web security practices. Awarded by our<br />program for excellence in learning outcomes.</div>
                <div className="mt-2 flex h-12 w-12 flex-col items-center justify-center rounded-full border-4 border-[#8f6518] bg-[#d9a832] font-serif text-[.4rem] font-bold md:h-16 md:w-16 md:text-[.55rem]"><span>BEST</span><span className="text-[.75rem] md:text-sm">2026</span><span>AWARD</span></div>
                <div className="absolute bottom-0 left-[4%] font-sans text-[clamp(.4rem,1vw,.65rem)]"><div>09/14/2026</div><div className="mt-1 border-t border-[#777] pt-1">Issue Date</div></div>
                <div className="absolute bottom-0 right-[4%] font-sans text-[clamp(.4rem,1vw,.65rem)]"><div className="font-serif text-[clamp(.8rem,2vw,1.5rem)] italic">K.Kharat</div><div className="mt-1 border-t border-[#777] pt-1">Program Director</div></div>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between gap-3">
              <span className="text-xs text-amber-300"><i className="fa-solid fa-lock mr-2" />Download locked until 200/200</span>
              <button disabled className="cursor-not-allowed rounded-lg bg-slate-700 px-4 py-2 text-xs font-bold text-slate-400 opacity-70"><i className="fa-solid fa-download mr-2" />Download locked</button>
            </div>
          </div>
        </div>
      )}

      {certificateReady ? (
        <section className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-6 md:p-10 text-center">
          <i className="fa-solid fa-award text-5xl text-amber-300 mb-4" />
          <h2 className="text-2xl font-bold text-white">All 200 MCQs completed</h2>
          <p className="text-slate-300 text-sm mt-2">Enter your name exactly as it should appear on the certificate.</p>
          <div className="max-w-md mx-auto flex flex-col sm:flex-row gap-3 mt-5"><input value={name} onChange={(event) => { setName(event.target.value); persist({ ...state, certificateName: event.target.value }); }} placeholder="Your full name" className="flex-1 rounded-lg border border-slate-600 bg-slate-950/70 px-4 py-3 text-white outline-none focus:border-cyan-400" /><button disabled={!name.trim()} onClick={downloadCertificate} className="rounded-lg bg-emerald-500 px-5 py-3 font-bold text-slate-950 disabled:opacity-40 cursor-pointer"><i className="fa-solid fa-download mr-2" />Download certificate</button></div>
        </section>
      ) : isLocked ? (
        <section className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-8 text-center"><i className="fa-solid fa-clock text-3xl text-amber-300 mb-3" /><h2 className="text-xl font-bold text-white">Daily limit reached</h2><p className="text-slate-300 text-sm mt-2">You have completed 50 MCQs today. Come back tomorrow to continue from question {questionNumber}.</p></section>
      ) : currentQuestion ? (
        <section className="rounded-2xl border border-cyan-500/25 bg-[#071827]/85 p-5 md:p-7">
          <div className="flex flex-wrap justify-between gap-2 text-[11px] font-mono text-slate-400"><span>QUESTION {questionNumber} / 200</span><span className="text-cyan-300">COMMAND: {currentQuestion.command}</span></div>
          <h2 className="text-lg md:text-xl font-semibold text-white mt-5 leading-relaxed">{currentQuestion.prompt}</h2>
          <div className="grid md:grid-cols-2 gap-3 mt-5">
            <div className="rounded-xl border border-cyan-500/20 bg-slate-950/60 p-4">
              <div className="text-[10px] uppercase tracking-wider font-bold text-cyan-300 mb-2"><i className="fa-solid fa-terminal mr-2" />Command syntax</div>
              <code className="block text-sm text-emerald-300 font-mono break-words">{currentQuestion.command} [options] [arguments]</code>
            </div>
            <div className="rounded-xl border border-amber-500/20 bg-slate-950/60 p-4">
              <div className="text-[10px] uppercase tracking-wider font-bold text-amber-300 mb-2"><i className="fa-solid fa-code mr-2" />Example</div>
              <code className="block text-sm text-amber-200 font-mono break-words">{currentQuestion.syntax}</code>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-3 mt-6">{currentQuestion.options.map((option, index) => { const isCorrect = index === currentQuestion.answer; const isChosen = index === selected; return <button key={`${currentQuestion.id}-${option}`} disabled={selected !== null} onClick={() => submitAnswer(index)} className={`text-left rounded-xl border px-4 py-4 text-sm transition cursor-pointer ${selected === null ? 'border-slate-700 bg-slate-950/40 hover:border-cyan-400 hover:bg-cyan-500/10 text-slate-200' : isCorrect ? 'border-emerald-400 bg-emerald-500/15 text-emerald-200' : isChosen ? 'border-red-400 bg-red-500/15 text-red-200' : 'border-slate-800 bg-slate-950/30 text-slate-500'}`}><span className="inline-flex w-7 h-7 items-center justify-center rounded-full border border-current mr-3 text-xs font-bold">{String.fromCharCode(65 + index)}</span>{option}</button>; })}</div>
          {selected !== null && <div className={`mt-5 rounded-xl border p-4 text-sm ${selected === currentQuestion.answer ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200' : 'border-red-400/30 bg-red-500/10 text-red-200'}`}><div className="font-bold mb-1"><i className={`fa-solid ${selected === currentQuestion.answer ? 'fa-circle-check' : 'fa-circle-xmark'} mr-2`} />{selected === currentQuestion.answer ? 'Correct answer' : 'Incorrect answer'}</div><div className="text-slate-300">{currentQuestion.explanation}</div><button onClick={goToNextQuestion} className="mt-4 rounded-lg bg-cyan-400 px-4 py-2 text-xs font-bold text-slate-950 cursor-pointer">Next question <i className="fa-solid fa-arrow-right ml-2" /></button></div>}
        </section>
      ) : null}
    </div>
  );
};
