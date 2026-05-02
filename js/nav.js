document.querySelectorAll('.nav-rope').forEach(e=>e.remove());
(function(){
      var f = document.getElementById('giForm');
      if (!f) return;
      f.addEventListener('submit', async function(ev){
        ev.preventDefault();
        var st = f.querySelector('.gi-status');
        var btn = f.querySelector('button');
        var data = Object.fromEntries(new FormData(f).entries());
        st.textContent = 'Sending…'; st.className='gi-status'; btn.disabled = true;
        try {
          var r = await fetch('https://reimake.com/api/contact', {
            method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify(Object.assign({site:'gorgeous.reimake.com'}, data))
          });
          var j = await r.json().catch(function(){return {};});
          if (r.ok && j.ok) { f.classList.add('sent'); st.textContent='✓ Sent — we will reply soon.'; st.className='gi-status ok'; }
          else throw new Error(j.detail || 'send failed');
        } catch(e) { st.textContent='✗ '+(e.message||'error'); st.className='gi-status err'; btn.disabled=false; }
      });
    })();
