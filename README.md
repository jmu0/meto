##METO PRINTER (beaglebone black)

###gpio pins toegankelijk maken
in /etc/rc.conf het script intgpio.sh uitvoeren
###seriele poorten toegankelijk maken
in /etc/modules-load.d/modules.conf: 
    usbserial
    pl2303
###systemd
user parameters veranderen!
**beaglebone**: meto.service kopieren naar /lib/systemd/system/
    
